"""Add action column to referrals table for tracking specific client steps."""

from alembic import op
import sqlalchemy as sa


revision = "20260604_1120_add_action_to_referrals"
down_revision = "20260531_0907_allow_payout_appeals_without_task_submission"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("referrals", sa.Column("action", sa.String(length=64), nullable=True))


def downgrade():
    op.drop_column("referrals", "action")