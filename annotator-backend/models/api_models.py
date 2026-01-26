from pydantic import BaseModel, Field, AliasChoices
from typing import List

class UserInfo(BaseModel):
    uuid: str

class AssayInfo(BaseModel):
    name: str
    cohorts: List[str]
    datasets: List[str]

class MinioSystemInfo(BaseModel):
    public_path: str

class SystemInfo(BaseModel):
    minio: MinioSystemInfo

class ToolConfigRequest(BaseModel):
    user_info: UserInfo = Field(..., validation_alias=AliasChoices('user-info', 'userInfo'))
    assay_info: AssayInfo = Field(..., validation_alias=AliasChoices('assay-info', 'assayInfo'))
    system: SystemInfo
