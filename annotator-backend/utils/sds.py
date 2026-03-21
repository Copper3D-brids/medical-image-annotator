import sparc_me as sm
from sparc_me import Dataset, Sample, Subject
from pathlib import Path
from shutil import copy2
import shutil
import tempfile
import threading
import zipfile
from datetime import datetime, timezone
import json
import pandas as pd
from models.db_model import SessionLocal, User, Assay, Case, CaseInput, CaseOutput
from sqlalchemy.orm import Session
from utils.setup import Config

# SDS template subdirectories that copy_tree needs to exist
_SDS_TEMPLATE_DIRS = ['code', 'derivative', 'docs', 'primary', 'protocol', 'source']

# Lock to protect sparc_me global state (Subject.count, Sample.count, etc.)
_sds_lock = threading.Lock()


class SDSDataset:
    def __init__(self, assay: Assay, db: Session):
        self.assay = assay
        self.db = db
        self.dest = Path(assay.output_sds_path)
        self.dataset = None
        self.subjects_count = 0

    def create_output_sds(self):
        with _sds_lock:
            self._create_output_sds_locked()

    def _create_output_sds_locked(self):
        # Build SDS in a temp directory, then atomically swap into dest
        temp_dir = Path(tempfile.mkdtemp(dir=self.dest.parent, prefix=".sds_tmp_"))
        original_dest = self.dest
        try:
            self.dest = temp_dir
            # Workaround for setuptools distutils bug: copy_tree() uses mkpath()
            # which caches created paths in SkipRepeatAbsolutePaths (process-level).
            # Pre-creating these dirs ensures they exist regardless of the stale cache.
            for dir_name in _SDS_TEMPLATE_DIRS:
                (self.dest / dir_name).mkdir(exist_ok=True)
            # Reset sparc_me class-level state that persists across requests
            Subject.count = 0
            Sample.count = 0
            Sample._previous_sub_id = ""
            # 0. create empty SDS dataset structure
            self.dataset = self._create_sds()
            # 1. update dataset description
            self._update_dataset_description()
            # 2. move files and update dataset
            self._move_files()

            # Swap: remove old dest, move temp to dest
            # Use shutil.move instead of rename — Windows blocks os.rename on non-empty dirs
            self.dest = original_dest
            if self.dest.exists():
                shutil.rmtree(self.dest)
            shutil.move(str(temp_dir), str(self.dest))
        except Exception:
            # Cleanup temp dir on failure, restore dest
            self.dest = original_dest
            if temp_dir.exists():
                shutil.rmtree(temp_dir)
            raise

    def _create_sds(self):
        dataset = sm.Dataset()
        dataset.set_path(str(self.dest))
        dataset.create_empty_dataset(version='2.0.0')
        dataset.save()
        return dataset

    def _update_dataset_description(self):
        dataset_description = self.dataset.get_metadata(metadata_file="dataset_description")
        dataset_description.add_values(element='type', values="experimental")
        dataset_description.add_values(element='Title', values="Medical Image Annotator Output")
        dataset_description.add_values(element='Keywords', values=["breast cancer", "image annotation"])
        dataset_description.set_values(
            element='Contributor orcid',
            values=["https://orcid.org/0000-0000-0000-0000"])
        dataset_description.save()

    def _move_files(self):
        if self.dataset is None:
            return

        cases = self.db.query(Case).filter(Case.assay_uuid == self.assay.uuid).all()

        for case in cases:
            case_output = case.output
            if case_output is None:
                continue

            # Collect valid samples (size > 0) with their metadata
            sample_entries = []
            for output_name in Config.OUTPUTS:
                col_prefix = output_name.replace("-", "_")
                size = getattr(case_output, f"{col_prefix}_size", None)
                path = getattr(case_output, f"{col_prefix}_path", None)

                if size is not None and size > 0 and path is not None:
                    sample = Sample()
                    sample.add_path(Path(path))
                    sample_entries.append((sample, output_name))

            if sample_entries:
                samples = [entry[0] for entry in sample_entries]
                subject = Subject()
                subject.add_samples(samples)
                # set_value must be called after sample is registered in dataset
                for sample, output_name in sample_entries:
                    sample.set_value(element='sample type', value=output_name)
                self.dataset.add_subjects([subject])
                self.subjects_count += 1

    def zip_dataset(self) -> Path:
        """Zip the SDS dataset directory and return the zip file path."""
        zip_path = self.dest.parent / f"{self.dest.name}.zip"
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for file in self.dest.rglob('*'):
                if file.is_file():
                    zf.write(file, file.relative_to(self.dest.parent))
        return zip_path
