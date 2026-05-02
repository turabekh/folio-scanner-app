import uuid
from datetime import datetime

from pydantic import BaseModel


class SearchHit(BaseModel):
    document_id: uuid.UUID
    document_title: str
    document_created_at: datetime
    page_count: int
    matching_page_id: uuid.UUID | None
    matching_page_number: int | None
    snippet: str | None
    rank: float


class SearchResponse(BaseModel):
    query: str
    hits: list[SearchHit]
    total: int