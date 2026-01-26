import json
import pprint
import time
import pandas as pd
from .setup import Config
from pathlib import Path
from zipfile import ZipFile
from io import BytesIO
from models.db_model import User, Assay, Case, CaseInput, CaseOutput
import os
import torch
import numpy as np
import SimpleITK as sitk


def get_metadata():
    """
    :return: df format metadata
    """
    metadata_path = Config.BASE_PATH / Config.METADATA_PATH
    if metadata_path.is_file() and metadata_path.suffix == ".xlsx":
        Config.METADATA = pd.read_excel(metadata_path, sheet_name="Sheet1")


def get_all_case_names(except_case: list = None):
    """
    :return: get each case name, the patient id for user to switch cases
    """
    if except_case is None:
        except_case = []
    if Config.METADATA is not None:
        case_names = list(set(Config.METADATA["Additional Metadata"]) - set(except_case))
        Config.CASE_NAMES = case_names
        return case_names
    return []


def check_file_exist(patient_id, filetype, filename):
    """
    :param patient_id: case name
    :param filename: mask.json mask.obj
    :return: if there is a mask.json file return true, else create a mask.json and return false
    """
    file_path = get_file_path(patient_id, filetype, filename)
    if file_path is not None:
        if filetype == "json":
            # Create the directory and all parent directories if they don't exist
            file_path.parent.mkdir(parents=True, exist_ok=True)
            if file_path.name != filename:
                new_file_path = file_path.parent / filename
                new_file_path.touch()
            else:
                if file_path.exists():
                    if file_path.stat().st_size != 0:
                        return True
                else:
                    return False
        else:
            return file_path.exists()
    return False


def get_file_path(patient_id, file_type, file_name):
    """
    :param patient_id: case name
    :param file_type: json, nrrd, nii
    :return: file full path via pathlib
    """
    if Config.METADATA is not None:
        file_df = Config.METADATA[
            (Config.METADATA["Additional Metadata"] == patient_id) & (Config.METADATA["file type"] == file_type)]
        # index = mask_json_df.index.tolist()
        # path = mask_json_df.loc[index[0], 'filename']
        paths = list(file_df['filename'])
        new_paths = []
        for path in paths:
            new_paths.append(Config.BASE_PATH / path)
        file_path_arr = [path for path in new_paths if path.name == file_name]
        if len(file_path_arr) > 0:
            file_path_full = file_path_arr[0]
            return file_path_full
    return None


def get_category_files(patient_id, file_type, categore, except_file_name=[]):
    """
        :param patient_id: case name
        :param file_type: json, nrrd, nii
        :return: file full path via pathlib
        """
    if Config.METADATA is not None:
        file_df = Config.METADATA[
            (Config.METADATA["Additional Metadata"] == patient_id) & (Config.METADATA["file type"] == file_type)]
        paths = list(file_df['filename'])
        new_paths = []
        for path in paths:
            file_path = Config.BASE_PATH / path
            if file_path.name not in except_file_name:
                new_paths.append(file_path)

        file_path_arr = [str(path).replace("\\", "/") for path in new_paths if
                         path.parent.name == categore and path.exists()]
        if len(file_path_arr) > 0:
            return file_path_arr
    return []


def save_sphere_points_to_json(patient_id, data):
    sphere_json_path = get_file_path(patient_id, "json", "sphere_points.json")
    if sphere_json_path is None:
        return False
    sphere_json_path = Path(sphere_json_path)
    if not sphere_json_path.parent.exists():
        sphere_json_path.mkdir(parents=True, exist_ok=True)

    with open(sphere_json_path, "w") as json_file:
        json.dump(data, json_file)
    return True


def selectNrrdPaths(patient_id, file_type, limit):
    """
    :param patient_id: name
    :param file_type: nrrd / nii / json
    :param limit: file parent folder name
    :return:
    """
    all_nrrd_paths = []
    nrrds_df = Config.METADATA[
        (Config.METADATA["file type"] == file_type) & (Config.METADATA["Additional Metadata"] == patient_id)]
    all_nrrd_paths.extend(list(nrrds_df["filename"]))
    selected_paths = []
    for file_path in all_nrrd_paths:
        if Path(file_path).parent.name == limit:
            selected_paths.append(file_path)
    return selected_paths


def getReturnedJsonFormat(path):
    """
    :param path:
    :return: returns BytesIO for response to frontend
    """
    with open(path, mode="rb") as file:
        file_contents = file.read()
    return BytesIO(file_contents)


def getJsonData(path):
    """
    get json core
    :param path:
    :return:
    """
    with open(path, 'rb') as file:
        # Load the JSON data from the file into a Python object
        return json.loads(file.read().decode('utf-8'))


def replace_data_to_json(case_output: CaseOutput, slice_json):
    """
    :param case_output: CaseOutput
    :param slice_json: a single slice mask pixels
    """
    json_path = Path(case_output.mask_json_path)
    index = slice_json.sliceId
    label = slice_json.label
    if json_path.exists():
        mask_json = getJsonData(json_path)
        mask_json[label][index]["data"] = slice_json.mask
        mask_json["hasData"] = True
        save_mask_data(case_output, mask_json)
    else:
        print("replace failed: mask json file does not exist")


def save_mask_data(case_output: CaseOutput, masks):
    """
    save mask.json to local drive
    """
    json_path = Path(case_output.mask_json_path)

    json_path.parent.mkdir(parents=True, exist_ok=True)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(masks, f, ensure_ascii=False)

    case_output.mask_json_size = json_path.stat().st_size


def init_tumour_position_json(path):
    tumour_position = {
        "nipple": {
            "position": None,
            "distance": "0",
            "start": "000000",
            "end": "000000",
            "duration": "000000"
        },
        "skin": {
            "position": None,
            "distance": "0",
            "start": "000000",
            "end": "000000",
            "duration": "000000"
        },
        "ribcage": {
            "position": None,
            "distance": "0",
            "start": "000000",
            "end": "000000",
            "duration": "000000"
        },
        "clock_face": {
            "face": "",
            "start": "000000",
            "end": "000000",
            "duration": "000000"
        },
        "start": "000000",
        "end": "000000",
        "total_duration": "000000",
        "spacing": None,
        "origin": None,
        "complete": False,
        "assisted": False
    }
    with open(path, 'w') as json_file:
        json.dump(tumour_position, json_file, indent=4)

