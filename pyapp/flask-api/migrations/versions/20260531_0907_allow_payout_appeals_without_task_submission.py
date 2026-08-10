"""allow payout appeals without task submission

Revision ID: 20260531_0907_allow_payout_appeals_without_task_submission
Revises: 20260529_1500_add_referral_url_template
Create Date: 2026-05-31 09:07:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "20260531_0907_allow_payout_appeals_without_task_submission"
down_revision = "20260529_1500_add_referral_url_template"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column(
        "appeals",
        "task_submission_id",
        existing_type=sa.String(length=36),
        nullable=True,
    )


def downgrade():
    op.alter_column(
        "appeals",
        "task_submission_id",
        existing_type=sa.String(length=36),
        nullable=False,
    )
