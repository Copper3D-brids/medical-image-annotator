import pandas as pd
import io
from urllib.parse import urljoin, urlparse
from typing import List, Dict
from minio import Minio
from minio.error import S3Error
from utils.setup import Config


class MinIOValidationError(Exception):
    """Structured error for MinIO validation failures."""
    def __init__(self, step: str, summary: str, detail: str):
        self.step = step
        self.summary = summary
        self.detail = detail
        super().__init__(summary)


class MinIOService:
    def __init__(self):
        self._client = None  # Lazy init

    @property
    def client(self) -> Minio:
        if self._client is None:
            self._client = Minio(
                endpoint=Config.MINIO_ENDPOINT,
                access_key=Config.MINIO_ACCESS_KEY,
                secret_key=Config.MINIO_SECRET_KEY,
                secure=Config.MINIO_SECURE,
            )
        return self._client

    def validate_base_url(self, base_url: str):
        if not base_url.startswith("http"):
            raise MinIOValidationError(
                step="1.1",
                summary=f"Invalid MinIO base URL: '{base_url}'",
                detail=f"URL must start with 'http' or 'https'. Received: '{base_url}'"
            )

    def _extract_bucket_and_path(self, full_url: str) -> tuple[str, str]:
        """
        Extract (bucket, object_path) from a full MinIO URL.
        Example:
            full_url = "http://minio:9000/measurements/primary/sub1/sample1/file.nrrd"
            → ("measurements", "primary/sub1/sample1/file.nrrd")
        Works with any bucket name — no MINIO_BUCKET config needed.
        """
        parsed = urlparse(full_url)
        # parsed.path = "/measurements/primary/sub1/sample1/file.nrrd"
        parts = parsed.path.lstrip('/').split('/', 1)
        if len(parts) < 2:
            raise ValueError(f"Cannot extract bucket/path from URL: {full_url}")
        return parts[0], parts[1]  # ("measurements", "primary/.../file.nrrd")

    def fetch_excel(self, url: str) -> pd.DataFrame:
        """Fetch Excel file from MinIO via SDK (supports private bucket)."""
        try:
            bucket, object_path = self._extract_bucket_and_path(url)
            print(f"  [MinIO] Fetching: bucket='{bucket}', path='{object_path}'")
            response = self.client.get_object(bucket, object_path)
            data = response.read()
            response.close()
            response.release_conn()
            return pd.read_excel(io.BytesIO(data))
        except S3Error as e:
            if e.code == "NoSuchBucket":
                bucket, _ = self._extract_bucket_and_path(url)
                raise MinIOValidationError(
                    step="minio",
                    summary=f"MinIO bucket '{bucket}' does not exist",
                    detail=f"Create the '{bucket}' bucket in MinIO and upload your dataset files."
                )
            elif e.code == "NoSuchKey":
                _, object_path = self._extract_bucket_and_path(url)
                raise MinIOValidationError(
                    step="minio",
                    summary=f"File not found in MinIO: {object_path}",
                    detail=f"The file '{object_path}' does not exist. Please upload the required metadata files to MinIO."
                )
            else:
                raise MinIOValidationError(
                    step="minio",
                    summary=f"MinIO error: {e.code}",
                    detail=f"URL: {url}, Error: {e}"
                )
        except Exception as e:
            raise MinIOValidationError(
                step="minio",
                summary=f"Cannot connect to MinIO or read file",
                detail=f"URL: {url}, Error: {type(e).__name__}: {e}"
            )

    def validate_and_resolve_inputs(
        self,
        public_path: str,
        datasets: List[str],
        cohorts: List[str],
        required_inputs: List[str]
    ) -> Dict[str, Dict[str, str]]:
        """
        Validates datasets, cohorts, and inputs.
        Returns: Dict[cohort, Dict[input_type, full_url]]
        """
        if not public_path.endswith("/"):
            public_path += "/"

        # Pre-fetch metadata for all datasets
        # dataset_name -> {subjects: df, samples: df, manifest: df, url: str}
        ds_meta = {}

        # 1.2 Validate datasets exist (by fetching metadata)
        print(f"[Step 1.2] Validating {len(datasets)} dataset(s): {datasets}")
        for ds in datasets:
            ds_url = urljoin(public_path, f"{ds}/")
            subjects_url = urljoin(ds_url, Config.SUBJECTS_METADATA_PATH)
            samples_url = urljoin(ds_url, Config.SAMPLES_METADATA_PATH)
            manifest_url = urljoin(ds_url, Config.METADATA_PATH)

            print(f"  Dataset '{ds}': expecting metadata at {ds_url}")
            try:
                ds_meta[ds] = {
                    "subjects": self.fetch_excel(subjects_url),
                    "samples": self.fetch_excel(samples_url),
                    "manifest": self.fetch_excel(manifest_url),
                    "url": ds_url
                }
                print(f"  Dataset '{ds}': OK")
            except MinIOValidationError:
                raise  # Already structured, pass through
            except Exception as e:
                raise MinIOValidationError(
                    step="1.2",
                    summary=f"Dataset '{ds}' metadata files missing in MinIO",
                    detail=(
                        f"Cannot read metadata for dataset '{ds}'. "
                        f"Expected files:\n"
                        f"  - {subjects_url}\n"
                        f"  - {samples_url}\n"
                        f"  - {manifest_url}\n"
                        f"Error: {e}"
                    )
                )

        # 1.3 Verify cohorts exist in ALL datasets' subjects.xlsx
        print(f"[Step 1.3] Verifying {len(cohorts)} cohort(s) in subjects.xlsx: {cohorts}")
        for ds_name, meta in ds_meta.items():
            subjects_df = meta['subjects']
            subject_col = next((c for c in subjects_df.columns if c.lower() == 'subject id'), None)
            if not subject_col:
                raise MinIOValidationError(
                    step="1.3",
                    summary=f"Dataset '{ds_name}': subjects.xlsx missing 'Subject ID' column",
                    detail=f"Found columns: {list(subjects_df.columns)}. Please add a 'Subject ID' column."
                )

            existing_subjects = set(subjects_df[subject_col].astype(str).values)
            print(f"  Dataset '{ds_name}': found {len(existing_subjects)} subject(s) in subjects.xlsx")
            for cohort in cohorts:
                if cohort not in existing_subjects:
                    raise MinIOValidationError(
                        step="1.3",
                        summary=f"Cohort '{cohort}' not found in dataset '{ds_name}'",
                        detail=f"Available subjects: {sorted(existing_subjects)}"
                    )

        # 1.4 & Resolve Inputs
        resolved_paths = {cohort: {} for cohort in cohorts}

        for cohort in cohorts:
            for inp_type in required_inputs:
                found = False
                for ds_name, meta in ds_meta.items():
                    samples_df = meta['samples']
                    manifest_df = meta['manifest']

                    # Find columns
                    sample_subj_col = next((c for c in samples_df.columns if c.lower() == 'subject id'), None)
                    sample_type_col = next((c for c in samples_df.columns if c.lower() == 'sample type'), None)
                    sample_id_col = next((c for c in samples_df.columns if c.lower() == 'sample id'), None)

                    if not (sample_subj_col and sample_type_col and sample_id_col):
                        continue  # Malformed samples.xlsx

                    # Filter samples for this cohort + input type
                    match = samples_df[
                        (samples_df[sample_subj_col].astype(str) == cohort) &
                        (samples_df[sample_type_col] == inp_type)
                    ]

                    if not match.empty:
                        man_filename_col = next((c for c in manifest_df.columns if c.lower() in ['filename', 'file name']), None)
                        if not man_filename_col:
                            continue  # Malformed manifest

                        for _, row in match.iterrows():
                            subj_id_val = str(row[sample_subj_col])
                            sample_id_val = str(row[sample_id_col])

                            search_str = f"primary/{subj_id_val}/{sample_id_val}"

                            file_match = manifest_df[
                                manifest_df[man_filename_col].astype(str).str.contains(search_str, regex=False)
                            ]

                            if not file_match.empty:
                                relative_path = file_match.iloc[0][man_filename_col]
                                full_url = urljoin(meta['url'], str(relative_path))
                                resolved_paths[cohort][inp_type] = full_url
                                found = True
                                break  # Found the file for this input

                        if found:
                            break  # Found this input in this dataset
                        else:
                            resolved_paths[cohort][inp_type] = None

                if not found:
                    resolved_paths[cohort][inp_type] = None

        return resolved_paths
