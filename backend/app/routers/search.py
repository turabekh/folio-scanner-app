from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.search import SearchHit, SearchResponse


router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=SearchResponse)
async def search(
    q: str = Query(min_length=1, max_length=200),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sql = text("""
        WITH ranked_pages AS (
            SELECT
                p.id AS page_id,
                p.document_id,
                p.page_number,
                ts_rank_cd(
                    to_tsvector('english', COALESCE(p.ocr_text, '')),
                    plainto_tsquery('english', :q)
                ) AS page_rank,
                ts_headline(
                    'english',
                    COALESCE(p.ocr_text, ''),
                    plainto_tsquery('english', :q),
                    'StartSel=<mark>,StopSel=</mark>,MaxFragments=1,MaxWords=20,MinWords=8'
                ) AS snippet,
                ROW_NUMBER() OVER (
                    PARTITION BY p.document_id
                    ORDER BY ts_rank_cd(
                        to_tsvector('english', COALESCE(p.ocr_text, '')),
                        plainto_tsquery('english', :q)
                    ) DESC,
                    p.page_number ASC
                ) AS row_num
            FROM pages p
            JOIN documents d ON d.id = p.document_id
            WHERE d.user_id = :user_id
              AND p.ocr_text IS NOT NULL
              AND to_tsvector('english', p.ocr_text) @@ plainto_tsquery('english', :q)
        ),
        title_matches AS (
            SELECT
                d.id AS document_id,
                ts_rank_cd(
                    to_tsvector('english', d.title),
                    plainto_tsquery('english', :q)
                ) AS title_rank
            FROM documents d
            WHERE d.user_id = :user_id
              AND to_tsvector('english', d.title) @@ plainto_tsquery('english', :q)
        )
        SELECT
            d.id AS document_id,
            d.title AS document_title,
            d.created_at AS document_created_at,
            d.page_count,
            rp.page_id AS matching_page_id,
            rp.page_number AS matching_page_number,
            rp.snippet,
            COALESCE(rp.page_rank, 0) + COALESCE(tm.title_rank, 0) * 2 AS rank
        FROM documents d
        LEFT JOIN ranked_pages rp ON rp.document_id = d.id AND rp.row_num = 1
        LEFT JOIN title_matches tm ON tm.document_id = d.id
        WHERE d.user_id = :user_id
          AND (rp.page_id IS NOT NULL OR tm.document_id IS NOT NULL)
        ORDER BY rank DESC, d.created_at DESC
        LIMIT :limit
    """)

    result = await db.execute(
        sql,
        {"q": q, "user_id": current_user.id, "limit": limit},
    )
    rows = result.mappings().all()

    hits = [SearchHit(**row) for row in rows]
    return SearchResponse(query=q, hits=hits, total=len(hits))