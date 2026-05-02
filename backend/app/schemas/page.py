import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


FilterName = Literal["original", "magic", "bw", "gray"]


class PageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    page_number: int
    original_storage_key: str | None
    enhanced_storage_key: str | None
    thumbnail_storage_key: str | None
    filter_applied: str | None
    width: int | None
    height: int | None
    created_at: datetime


class PageEnhanceRequest(BaseModel):
    filter: FilterName