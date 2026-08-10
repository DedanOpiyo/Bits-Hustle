"""add is_percentage to referral_rates

Revision ID: add_is_percentage_to_referral_rates
Revises: 20260527_0609_add_password_mgmt_columns
Create Date: 2026-05-27 15:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260527_1545_add_is_percentage_to_referral_rates'
down_revision = '20260527_0609_add_password_mgmt_columns'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('referral_rates', sa.Column('is_percentage', sa.Boolean, server_default='0', nullable=False))


def downgrade():
    op.drop_column('referral_rates', 'is_percentage')