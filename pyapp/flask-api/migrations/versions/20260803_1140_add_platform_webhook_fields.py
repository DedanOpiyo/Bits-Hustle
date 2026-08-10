"""add webhook_secret and webhook_url to platform_types

Revision ID: 20260803_1140_add_platform_webhook_fields
Revises: 20260802_1330_add_gig_proposals
Create Date: 2026-08-03 11:40:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260803_1140_add_platform_webhook_fields"
down_revision = "20260802_1330_add_gig_proposals"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "platform_types" in inspector.get_table_names():
        existing = {column["name"] for column in inspector.get_columns("platform_types")}
        with op.batch_alter_table("platform_types") as batch_op:
            if "webhook_secret" not in existing:
                batch_op.add_column(sa.Column("webhook_secret", sa.String(length=255), nullable=True))
            if "webhook_url" not in existing:
                batch_op.add_column(sa.Column("webhook_url", sa.String(length=512), nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "platform_types" in inspector.get_table_names():
        existing = {column["name"] for column in inspector.get_columns("platform_types")}
        with op.batch_alter_table("platform_types") as batch_op:
            if "webhook_url" in existing:
                batch_op.drop_column("webhook_url")
            if "webhook_secret" in existing:
                batch_op.drop_column("webhook_secret")
