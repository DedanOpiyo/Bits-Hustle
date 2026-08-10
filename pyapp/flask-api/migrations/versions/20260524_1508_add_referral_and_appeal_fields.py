"""add_referral_and_appeal_fields

Revision ID: 20260524_1508
Revises: 20260524_0145
Create Date: 2026-05-24 15:08:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260524_1508"
down_revision = "20260524_0145"
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to referrals table
    op.add_column("referrals", sa.Column("referral_code_used", sa.String(64), nullable=True))
    op.add_column("referrals", sa.Column("conversion_status", sa.String(32), nullable=False, server_default="PENDING"))
    op.add_column("referrals", sa.Column("referred_platform_id", sa.String(36), nullable=True))

    # Create foreign key for referred_platform_id
    op.create_foreign_key(
        "fk_referrals_referred_platform_id",
        "referrals",
        "platform_types",
        ["referred_platform_id"],
        ["id"],
    )

    # Add payout_request_id column to appeals table
    op.add_column("appeals", sa.Column("payout_request_id", sa.String(36), nullable=True))

    # Create foreign key for payout_request_id
    op.create_foreign_key(
        "fk_appeals_payout_request_id",
        "appeals",
        "payout_requests",
        ["payout_request_id"],
        ["id"],
    )


def downgrade():
    # Drop foreign key and column from appeals table
    op.drop_constraint("fk_appeals_payout_request_id", "appeals", type_="foreignkey")
    op.drop_column("appeals", "payout_request_id")

    # Drop foreign key and columns from referrals table
    op.drop_constraint("fk_referrals_referred_platform_id", "referrals", type_="foreignkey")
    op.drop_column("referrals", "referred_platform_id")
    op.drop_column("referrals", "conversion_status")
    op.drop_column("referrals", "referral_code_used")
