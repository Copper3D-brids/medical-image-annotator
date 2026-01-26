from utils import convert_to_nii_sigel_channel, tools, convert
from utils.ws_manager import manager
from utils.setup import TumourData
import io
import asyncio
from models.db_model import SessionLocal, Case, CaseInput, CaseOutput
from pathlib import Path


def json_converter(case_id: str):
    with SessionLocal() as session:
        case = session.query(Case).filter(Case.id == case_id).first()  # type: ignore
        case_output = session.query(CaseOutput).filter(CaseOutput.case_id == case_id).first()  # type: ignore

        assert isinstance(case_output, CaseOutput)
        assert isinstance(case.input, CaseInput)
        pre_nrrd = case.input.contrast_pre_path

        # delete current obj file
        mesh_obj_path = Path(case_output.mask_obj_path)
        if mesh_obj_path.exists():
            mesh_obj_path.write_text("")
            case_output.mask_obj_size = mesh_obj_path.stat().st_size

        convert.convert_json_to_obj(case_output)
        session.commit()
        session.refresh(case_output)
        # Performing time-consuming calculation tasks
        # convert_to_nii_sigel_channel(casename)
        # convert.convert_to_nrrd_sigel_channel(casename)
        # convert.convert_to_nii_full_channels(casename)
        convert.convert_to_nii(case_output, pre_nrrd)
        print("finish covert nii and mesh.")
        
        # Send notification to frontend via WebSocket
        # Use asyncio.run() since we're in a sync function running in threadpool
        asyncio.run(notify_frontend(case_id))


async def notify_frontend(case_id: str):
    """Send completion notification to the connected frontend via WebSocket."""
    await manager.send_notification(case_id, {
        "status": "complete",
        "case_id": case_id,
        "action": "reload_obj",
        "volume": TumourData.volume
    })
    print(f"Sent notification to frontend for case {case_id}")

