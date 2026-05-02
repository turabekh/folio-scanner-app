import io
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from PIL import Image
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import get_db
from app.models import Document, Page, User
from app.schemas.document import DocumentCreateRequest, DocumentResponse
from app.schemas.page import PageEnhanceRequest, PageResponse
from app.services.image_processing import apply_filter
from app.services.storage import (
    delete_object,
    download_bytes,
    page_storage_key,
    upload_bytes,
)


router = APIRouter(prefix="/documents", tags=["documents"])


ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_UPLOAD_BYTES = 25 * 1024 * 1024


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


async def _get_owned_page(
    document_id: uuid.UUID,
    page_id: uuid.UUID,
    user: User,
    db: AsyncSession,
) -> Page:
    result = await db.execute(
        select(Page)
        .join(Document, Page.document_id == Document.id)
        .where(
            Page.id == page_id,
            Page.document_id == document_id,
            Document.user_id == user.id,
        )
    )
    page = result.scalar_one_or_none()
    if page is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Page not found",
        )
    return page


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


@router.get("/{document_id}/pages", response_model=list[PageResponse])
async def list_pages(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_document(document_id, current_user, db)

    result = await db.execute(
        select(Page)
        .where(Page.document_id == document_id)
        .order_by(Page.page_number)
    )
    return list(result.scalars().all())


@router.post(
    "/{document_id}/pages",
    response_model=PageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_page(
    document_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    document = await _get_owned_document(document_id, current_user, db)

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported content type. Allowed: {sorted(ALLOWED_CONTENT_TYPES)}",
        )

    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {MAX_UPLOAD_BYTES} bytes",
        )

    try:
        with Image.open(io.BytesIO(raw)) as img:
            img.verify()
        with Image.open(io.BytesIO(raw)) as img:
            width, height = img.size
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file",
        )

    extension = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    }[file.content_type]

    next_number_result = await db.execute(
        select(func.coalesce(func.max(Page.page_number), 0) + 1).where(
            Page.document_id == document_id
        )
    )
    next_page_number = next_number_result.scalar_one()

    page = Page(
        document_id=document_id,
        page_number=next_page_number,
        width=width,
        height=height,
    )
    db.add(page)
    await db.flush()

    storage_key = page_storage_key(
        current_user.id, document_id, page.id, "original", extension
    )

    try:
        await upload_bytes(storage_key, raw, file.content_type)
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store image",
        )

    page.original_storage_key = storage_key
    document.page_count = document.page_count + 1

    try:
        await db.commit()
    except Exception:
        await delete_object(storage_key)
        raise

    await db.refresh(page)
    return page


@router.get("/{document_id}/pages/{page_id}/image")
async def get_page_image(
    document_id: uuid.UUID,
    page_id: uuid.UUID,
    variant: str = Query("auto", pattern="^(auto|original|enhanced)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await _get_owned_page(document_id, page_id, current_user, db)

    if variant == "original":
        key = page.original_storage_key
    elif variant == "enhanced":
        key = page.enhanced_storage_key
    else:
        key = page.enhanced_storage_key or page.original_storage_key

    if key is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Page image not available",
        )

    body, content_type = await download_bytes(key)
    return Response(
        content=body,
        media_type=content_type,
        headers={"Cache-Control": "private, max-age=300"},
    )


@router.post(
    "/{document_id}/pages/{page_id}/enhance",
    response_model=PageResponse,
)
async def enhance_page(
    document_id: uuid.UUID,
    page_id: uuid.UUID,
    payload: PageEnhanceRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await _get_owned_page(document_id, page_id, current_user, db)

    if page.original_storage_key is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Page has no original image",
        )

    original_bytes, _ = await download_bytes(page.original_storage_key)
    enhanced_bytes = apply_filter(original_bytes, payload.filter)

    old_enhanced_key = page.enhanced_storage_key
    new_enhanced_key = None

    if payload.filter != "original":
        new_enhanced_key = page_storage_key(
            current_user.id, document_id, page.id, f"enhanced_{payload.filter}", "jpg"
        )
        try:
            await upload_bytes(new_enhanced_key, enhanced_bytes, "image/jpeg")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to store enhanced image",
            )

    page.enhanced_storage_key = new_enhanced_key
    page.filter_applied = payload.filter
    await db.commit()
    await db.refresh(page)

    if old_enhanced_key and old_enhanced_key != new_enhanced_key:
        try:
            await delete_object(old_enhanced_key)
        except Exception:
            pass

    return page