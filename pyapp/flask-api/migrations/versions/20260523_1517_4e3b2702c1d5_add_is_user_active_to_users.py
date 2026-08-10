"""add_is_user_active_to_users

Revision ID: 4e3b2702c1d5
Revises: 7685533d12c3
Create Date: 2025-05-23 15:17

"""
from alembic import op
import sqlalchemy as sa

revision = '4e3b2702c1d5'
down_revision = '7685533d12c3'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('is_user_active', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade():
    op.drop_column('users', 'is_user_active')
