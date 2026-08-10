"""add referral_url_template to platform_types

Revision ID: 20260529_1500_add_referral_url_template
Revises: 0e9f89204986
Create Date: 2026-05-29 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '20260529_1500_add_referral_url_template'
down_revision = '0e9f89204986'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('platform_types', sa.Column('referral_url_template', sa.String(512), nullable=True))


def downgrade():
    op.drop_column('platform_types', 'referral_url_template')
