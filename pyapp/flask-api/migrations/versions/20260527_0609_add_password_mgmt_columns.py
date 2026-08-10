"""add password management columns to users

Revision ID: add_password_mgmt_columns
Revises: 20260527_0540_add_tier_action_types
Create Date: 2026-05-27 06:09:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260527_0609_add_password_mgmt_columns'
down_revision = '20260527_0540_add_tier_action_types'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    # Check if columns exist before adding (idempotent migration)
    columns = conn.execute(sa.text("SHOW COLUMNS FROM users")).fetchall()
    existing = {row[0] for row in columns}

    if 'must_change_password' not in existing:
        op.add_column('users', sa.Column('must_change_password', sa.Boolean(), nullable=False, server_default=sa.false()))
    if 'password_reset_token' not in existing:
        op.add_column('users', sa.Column('password_reset_token', sa.String(255), nullable=True))
    if 'password_reset_token_expires' not in existing:
        op.add_column('users', sa.Column('password_reset_token_expires', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('users', 'password_reset_token_expires')
    op.drop_column('users', 'password_reset_token')
    op.drop_column('users', 'must_change_password')
