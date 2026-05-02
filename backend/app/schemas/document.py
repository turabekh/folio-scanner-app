import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


DocumentKind = Literal["document", "id_card"]


class DocumentCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    kind: DocumentKind = "document"


class DocumentUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    kind: str
    page_count: int
    pdf_storage_key: str | None
    pdf_generated_at: datetime | None
    created_at: datetime
    updated_at: datetime