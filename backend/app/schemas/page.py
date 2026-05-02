import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    page_number: int
    original_storage_key: str | None
    enhanced_storage_key: str | None
    thumbnail_storage_key: str | None
    width: int | None
    height: int | None
    created_at: datetime