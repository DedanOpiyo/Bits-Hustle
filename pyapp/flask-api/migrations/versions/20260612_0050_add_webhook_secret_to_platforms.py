"""add webhook_secret columns to platform_types

Revision ID: 20260612_0050
Revises: 20260604_1120_add_action_to_referrals

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260612_0050_add_webhook_secret_to_platforms'
down_revision = '20260604_1120_add_action_to_referrals'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    columns = conn.execute(sa.text("SHOW COLUMNS FROM platform_types")).fetchall()
    existing_cols = {row[0] for row in columns}

    if 'webhook_secret_hash' not in existing_cols:
        op.add_column('platform_types', sa.Column('webhook_secret_hash', sa.String(255), nullable=True))
    if 'webhook_secret_prefix' not in existing_cols:
        op.add_column('platform_types', sa.Column('webhook_secret_prefix', sa.String(8), nullable=True))


def downgrade():
    conn = op.get_bind()
    columns = conn.execute(sa.text("SHOW COLUMNS FROM platform_types")).fetchall()
    existing_cols = {row[0] for row in columns}

    if 'webhook_secret_prefix' in existing_cols:
        op.drop_column('platform_types', 'webhook_secret_prefix')
    if 'webhook_secret_hash' in existing_cols:
        op.drop_column('platform_types', 'webhook_secret_hash')