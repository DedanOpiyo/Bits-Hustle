"""add logo_url to platform_types

Revision ID: 20260814_1440_add_platform_logo_url
Revises: 20260803_1140_add_platform_webhook_fields
Create Date: 2026-08-14 14:40:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260814_1440_add_platform_logo_url"
down_revision = "20260803_1140_add_platform_webhook_fields"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "platform_types" in inspector.get_table_names():
        existing = {column["name"] for column in inspector.get_columns("platform_types")}
        with op.batch_alter_table("platform_types") as batch_op:
            if "logo_url" not in existing:
                batch_op.add_column(sa.Column("logo_url", sa.String(length=512), nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "platform_types" in inspector.get_table_names():
        existing = {column["name"] for column in inspector.get_columns("platform_types")}
        with op.batch_alter_table("platform_types") as batch_op:
            if "logo_url" in existing:
                batch_op.drop_column("logo_url")
