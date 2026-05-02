import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import get_db
from app.models import Document, User
from app.schemas.document import DocumentCreateRequest, DocumentResponse


router = APIRouter(prefix="/documents", tags=["documents"])


async def _get_owned_document(
    document_id: uuid.UUID,
    user: User,
    db: AsyncSession,
) -> Document:
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == user.id,
        )
    )
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    return document


@router.get("", response_model=list[DocumentResponse])
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
    )
    return list(result.scalars().all())


@router.post(
    "",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_document(
    payload: DocumentCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    document = Document(
        user_id=current_user.id,
        title=payload.title,
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)
    return document


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_owned_document(document_id, current_user, db)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    document = await _get_owned_document(document_id, current_user, db)
    await db.delete(document)
    await db.commit()