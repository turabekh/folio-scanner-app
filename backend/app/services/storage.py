import uuid

import aioboto3
from botocore.config import Config

from app.config import settings


_session = aioboto3.Session()


def _client_kwargs() -> dict:
    return {
        "service_name": "s3",
        "endpoint_url": settings.s3_endpoint_url,
        "region_name": settings.s3_region,
        "aws_access_key_id": settings.s3_access_key,
        "aws_secret_access_key": settings.s3_secret_key,
        "use_ssl": settings.s3_use_ssl,
        "config": Config(signature_version="s3v4"),
    }


def s3_client():
    return _session.client(**_client_kwargs())


async def check_bucket() -> bool:
    async with s3_client() as client:
        await client.head_bucket(Bucket=settings.s3_bucket)
    return True


async def upload_bytes(key: str, data: bytes, content_type: str) -> str:
    async with s3_client() as client:
        await client.put_object(
            Bucket=settings.s3_bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
    return key


async def download_bytes(key: str) -> tuple[bytes, str]:
    async with s3_client() as client:
        response = await client.get_object(Bucket=settings.s3_bucket, Key=key)
        body = await response["Body"].read()
        content_type = response.get("ContentType", "application/octet-stream")
        return body, content_type


async def delete_object(key: str) -> None:
    async with s3_client() as client:
        await client.delete_object(Bucket=settings.s3_bucket, Key=key)


def page_storage_key(user_id: uuid.UUID, document_id: uuid.UUID, page_id: uuid.UUID, kind: str, ext: str) -> str:
    return f"users/{user_id}/documents/{document_id}/pages/{page_id}/{kind}.{ext}"


def document_pdf_key(user_id: uuid.UUID, document_id: uuid.UUID) -> str:
    return f"users/{user_id}/documents/{document_id}/output.pdf"