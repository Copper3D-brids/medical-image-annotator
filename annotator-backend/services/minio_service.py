import requests
import pandas as pd
import io
from urllib.parse import urljoin
from typing import List, Dict
from utils.setup import Config

class MinIOService:
    def validate_public_path(self, public_path: str):
        if not public_path.startswith("http"):
            raise ValueError(f"Invalid MinIO public path: {public_path}")

    def fetch_excel(self, url: str) -> pd.DataFrame:
        try:
            print(f"Fetching {url}")
            response = requests.get(url)
            response.raise_for_status()
            # Suppress default index to ensure we strictly check columns
            return pd.read_excel(io.BytesIO(response.content))
        except Exception as e:
            raise ValueError(f"Failed to fetch or parse {url}: {e}")

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
        for ds in datasets:
            ds_url = urljoin(public_path, f"{ds}/")
            subjects_url = urljoin(ds_url, Config.SUBJECTS_METADATA_PATH)
            samples_url = urljoin(ds_url, Config.SAMPLES_METADATA_PATH)
            manifest_url = urljoin(ds_url, Config.METADATA_PATH)

            try:
                ds_meta[ds] = {
                    "subjects": self.fetch_excel(subjects_url),
                    "samples": self.fetch_excel(samples_url),
                    "manifest": self.fetch_excel(manifest_url),
                    "url": ds_url
                }
            except ValueError as e:
                # If we can't fetch metadata, assume dataset doesn't exist or is invalid
                raise ValueError(f"Dataset validation failed for '{ds}': {e}")

        # 1.3 Verify cohorts exist in ALL datasets' subjects.xlsx
        # "验证 所提供的cohorts名字是否都存在于所提供的所有datasets中subjects.xlsx文件的subject id中"
        for ds_name, meta in ds_meta.items():
            subjects_df = meta['subjects']
            # Normalize column names just in case, but assume standard 'subject id'
            # Check if 'subject id' col exists
            subject_col = next((c for c in subjects_df.columns if c.lower() == 'subject id'), None)
            if not subject_col:
                raise ValueError(f"Dataset '{ds_name}' subjects.xlsx is missing 'subject id' column.")
            
            existing_subjects = set(subjects_df[subject_col].astype(str).values)
            for cohort in cohorts:
                if cohort not in existing_subjects:
                    raise ValueError(f"Cohort '{cohort}' not found in dataset '{ds_name}'.")

        # 1.4 & Resolve Inputs
        # "Map inputs... inputs don't need to be in every dataset, but must find all inputs for all cohorts"
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
                        continue # Malformed samples.xlsx

                    # Filter samples for this cohort + input type
                    match = samples_df[
                        (samples_df[sample_subj_col].astype(str) == cohort) & 
                        (samples_df[sample_type_col] == inp_type)
                    ]


                    if not match.empty:
                        # Found sample(s) in samples.xlsx
                        # We need to find the corresponding file in manifest.xlsx
                        # Logic: Construct "primary/{subject_id}/{sample_id}" and check if it exists in any manifest filename
                        
                        man_filename_col = next((c for c in manifest_df.columns if c.lower() in ['filename', 'file name']), None)
                        if not man_filename_col:
                            continue # Malformed manifest
                        
                        # Iterate over found samples
                        for _, row in match.iterrows():
                            subj_id_val = str(row[sample_subj_col])
                            sample_id_val = str(row[sample_id_col])
                            
                            # Construct search string: primary/subject_id/sample_id
                            # Note: Ensure separators are correct (forward slash usually for S3/MinIO/SDS paths)
                            search_str = f"primary/{subj_id_val}/{sample_id_val}"
                            
                            # Filter manifest: Check if filename contains the search_str
                            # We assume manifest filenames are strings
                            file_match = manifest_df[
                                manifest_df[man_filename_col].astype(str).str.contains(search_str, regex=False)
                            ]
                            
                            if not file_match.empty:
                                # Found the file! match the first one
                                relative_path = file_match.iloc[0][man_filename_col]
                                
                                # Construct full path
                                full_url = urljoin(meta['url'], str(relative_path))

                                print(full_url)
                                resolved_paths[cohort][inp_type] = full_url
                                found = True
                                break # Found the file for this input, break inner loop (samples)
                        
                        if found:
                            break # Found this input in this dataset, break dataset loop
                
                if not found:
                    raise ValueError(f"Could not find input '{inp_type}' for cohort '{cohort}' in any provided dataset.")
                    
        return resolved_paths
