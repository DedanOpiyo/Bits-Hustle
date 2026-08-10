"""add_missing_payout_request_columns

Revision ID: 20260525_0000
Revises: 20260524_1508
Create Date: 2026-05-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '20260525_0000'
down_revision = '20260524_1508'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('payout_requests')]
    
    with op.batch_alter_table('payout_requests', schema=None) as batch_op:
        if 'platform_id' not in columns:
            batch_op.add_column(sa.Column('platform_id', sa.String(36), nullable=True))
        if 'rejection_reason' not in columns:
            batch_op.add_column(sa.Column('rejection_reason', sa.Text(), nullable=True))
    
    # Add foreign key if platform_id was just added
    if 'platform_id' not in columns:
        op.create_foreign_key(
            'fk_payout_requests_platform_id',
            'payout_requests',
            'platform_types',
            ['platform_id'],
            ['id']
        )


def downgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('payout_requests')]
    
    with op.batch_alter_table('payout_requests', schema=None) as batch_op:
        if 'rejection_reason' in columns:
            batch_op.drop_column('rejection_reason')
    
    op.drop_constraint('fk_payout_requests_platform_id', 'payout_requests', type_='foreignkey')
    
    with op.batch_alter_table('payout_requests', schema=None) as batch_op:
        if 'platform_id' in columns:
            batch_op.drop_column('platform_id')