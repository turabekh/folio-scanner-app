"""add server default for user id

Revision ID: 80a3b6f2294c
Revises: f05a358f9e42
Create Date: 2026-05-02 04:19:49.433752

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '80a3b6f2294c'
down_revision: Union[str, None] = 'f05a358f9e42'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS pgcrypto')
    op.alter_column(
        "users",
        "id",
        server_default=sa.text("gen_random_uuid()"),
    )


def downgrade() -> None:
    op.alter_column(
        "users",
        "id",
        server_default=None,
    )