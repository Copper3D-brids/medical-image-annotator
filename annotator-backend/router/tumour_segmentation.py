from fastapi import APIRouter
import json
import time
from fastapi import Query, BackgroundTasks, WebSocket, HTTPException, Depends
from fastapi.responses import FileResponse, StreamingResponse
from utils import tools, TumourData
from utils.ws_manager import manager
from models import model
from task import task_oi
from pathlib import Path
from models.api_models import UserAuth
from sqlalchemy.orm import Session
from models.db_model import User, Assay, Case, CaseInput, CaseOutput
from services.minio_service import MinIOService
from database.database import get_db

router = APIRouter()


@router.websocket('/ws/{case_id}')
async def websocket_endpoint(websocket: WebSocket, case_id: str):
    """WebSocket endpoint for receiving OBJ conversion completion notifications.
    
    Args:
        websocket: The WebSocket connection
        case_id: The case ID to associate with this connection
    """
    await manager.connect(case_id, websocket)
    try:
        while True:
            # Keep connection alive, just wait for messages
            await websocket.receive_text()
    except Exception as e:
        print(f"WebSocket closed for case {case_id}: {e}")
    finally:
        manager.disconnect(case_id)


@router.post('/api/cases')
async def get_cases_infos(auth: UserAuth, db: Session = Depends(get_db)):
    res = {
        "names": [],
        "details": []
    }
    # get cases from db
    cases = db.query(Case).filter(Case.assay_uuid == auth.assay_uuid,  # type: ignore
                                  Case.user_uuid == auth.user_uuid).all()  # type: ignore
    for case in cases:
        res["names"].append(case.name)
        res["details"].append({
            "id": case.id,
            "name": case.name,
            "assay_uuid": case.assay_uuid,
            "input": {
                "contrast_pre": case.input.contrast_pre_path if case.input else None,
                "contrast_1": case.input.contrast_1_path if case.input else None,
                "contrast_2": case.input.contrast_2_path if case.input else None,
                "contrast_3": case.input.contrast_3_path if case.input else None,
                "contrast_4": case.input.contrast_4_path if case.input else None,
                "registration_pre": case.input.registration_pre_path if case.input else None,
                "registration_1": case.input.registration_1_path if case.input else None,
                "registration_2": case.input.registration_2_path if case.input else None,
                "registration_3": case.input.registration_3_path if case.input else None,
                "registration_4": case.input.registration_4_path if case.input else None,
            },
            "output": {
                "mask_json_path": case.output.mask_json_path if case.output else None,
                "mask_json_size": case.output.mask_json_size if case.output else None,
                "mask_obj_path": case.output.mask_obj_path if case.output else None,
                "mask_obj_size": case.output.mask_obj_size if case.output else None,
            }
        })
    return res


async def process_file(file_path: Path, headers: dict):
    if file_path.suffix == '.nrrd':
        return FileResponse(file_path, media_type="application/octet-stream", filename=file_path.name, headers=headers)
    elif file_path.suffix == '.json':
        file_object = tools.getReturnedJsonFormat(file_path)
        return StreamingResponse(file_object, media_type="application/json", headers=headers)
    elif file_path.suffix == '.obj':
        return FileResponse(file_path, media_type="application/octet-stream", filename=file_path.name, headers=headers)
    else:
        return None


@router.get('/api/single-file')
async def send_single_file(path: str = Query(None)):
    file_path = Path(path)
    print(file_path)
    if file_path.exists():
        headers = {"x-file-name": file_path.name}
        response = await process_file(file_path, headers)
        if response:
            return response
        else:
            return "Unsupported file format!"
    else:
        return "No file exists!"


@router.post("/api/mask/init")
async def init_mask(mask: model.Masks, db: Session = Depends(get_db)):
    case_output = db.query(CaseOutput).filter(CaseOutput.case_id == mask.caseId).first()  # type: ignore
    if not case_output:
        raise HTTPException(status_code=404, detail="CaseOutput not found")
    tools.save_mask_data(case_output, mask.masks)

    db.commit()
    db.refresh(case_output)
    return True


@router.post("/api/mask/replace")
async def replace_mask(mask: model.Mask, db: Session = Depends(get_db)):
    case_output = db.query(CaseOutput).filter(CaseOutput.case_id == mask.caseId).first()  # type: ignore
    if not case_output:
        raise HTTPException(status_code=404, detail="CaseOutput not found")

    assert isinstance(case_output, CaseOutput)
    tools.replace_data_to_json(case_output, mask)

    db.commit()
    db.refresh(case_output)
    return True


@router.get("/api/clearmesh")
async def clear_mesh(case_id: str = Query(None), db: Session = Depends(get_db)):
    case_output = db.query(CaseOutput).filter(CaseOutput.case_id == case_id).first()  # type: ignore
    if not case_output:
        raise HTTPException(status_code=404, detail="CaseOutput not found")

    assert isinstance(case_output, CaseOutput)
    mesh_obj_path = Path(case_output.mask_obj_path)
    if mesh_obj_path.exists():
        mesh_obj_path.write_text("")
        case_output.mask_obj_size = mesh_obj_path.stat().st_size

        db.commit()
        db.refresh(case_output)
        return True
    else:
        mesh_obj_path.mkdir(parents=True, exist_ok=True)
        print("No mesh obj exists!")
        return False


@router.get("/api/mask/save")
async def save_mask(case_id: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(task_oi.json_converter, case_id)
    return True


@router.get("/api/breast_points")
async def get_breast_points(name: str = Query(None), filename: str = Query(None)):
    checked = tools.check_file_exist(name, "json", f"{filename}.json")
    if checked:
        path = tools.get_file_path(name, "json", f"{filename}.json")
        if "nipple" in filename:
            file_object = tools.getReturnedJsonFormat(path)
            return StreamingResponse(file_object, media_type="application/json")
        else:
            # file_object = tools.getReturnedJsonFormat(path)
            return FileResponse(path, media_type="application/json")
    else:
        return False


@router.get("/api/breast_model")
async def get_display_breast_model(name: str = Query(None)):
    breast_mesh_path = tools.get_file_path(name, "obj", "prone_surface.obj")
    if breast_mesh_path is not None and breast_mesh_path.exists():
        file_res = FileResponse(breast_mesh_path, media_type="application/octet-stream", filename="prone_surface.obj")
        return file_res
    else:
        return False


@router.post("/api/save_tumour_position")
async def save_tumour_position(save_position: model.TumourPosition):
    tumour_position_path = tools.get_file_path(save_position.case_name, "json", "tumour_window.json")
    position_json = {}
    if tumour_position_path.exists():
        with open(tumour_position_path, "r") as tumour_position_file:
            data = tumour_position_file.read()
            position_json = json.loads(data)
    position_json["center"] = save_position.model_dump().get("position")
    position_json["validate"] = save_position.model_dump().get("validate", False)
    with open(tumour_position_path, "w") as tumour_position_file:
        json.dump(position_json, tumour_position_file, indent=4)

    return True
