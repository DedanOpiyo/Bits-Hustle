"""add rejection_reason to task_submissions

Revision ID: 20260527_0512
Revises: 20260525_0000
Create Date: 2026-05-27 05:12:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '20260527_0512'
down_revision = '20260525_0000'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('task_submissions')]
    
    with op.batch_alter_table('task_submissions', schema=None) as batch_op:
        if 'rejection_reason' not in columns:
            batch_op.add_column(sa.Column('rejection_reason', sa.Text(), nullable=True))


def downgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('task_submissions')]
    
    with op.batch_alter_table('task_submissions', schema=None) as batch_op:
        if 'rejection_reason' in columns:
            batch_op.drop_column('rejection_reason')
