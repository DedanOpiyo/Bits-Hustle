"""add_missing_ambassador_columns

Revision ID: 7685533d12c3
Revises: 2b328d0721c4
Create Date: 2026-05-23 05:51:51

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = '7685533d12c3'
down_revision: Union[str, Sequence[str], None] = '2b328d0721c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add columns that exist in the SQLAlchemy models but are missing from the DB schema."""
    with op.batch_alter_table('ambassadors', schema=None) as batch_op:
        batch_op.add_column(sa.Column('tier',            sa.String(length=32),                         nullable=False, server_default='JUNIOR'))
        batch_op.add_column(sa.Column('status',          sa.String(length=32),                         nullable=False, server_default='ACTIVE'))
        batch_op.add_column(sa.Column('last_active_at',  sa.DateTime(),                                nullable=True))
        batch_op.add_column(sa.Column('fraud_strike_count', sa.Integer(),                            nullable=True, server_default='0'))
        batch_op.add_column(sa.Column('suspension_reason', sa.String(length=128),                     nullable=True))
        batch_op.add_column(sa.Column('suspended_until',  sa.DateTime(),                             nullable=True))

    with op.batch_alter_table('campaigns', schema=None) as batch_op:
        batch_op.add_column(sa.Column('approval_status',   sa.String(length=32),                       nullable=False, server_default='PENDING'))
        batch_op.add_column(sa.Column('approved_by_id',    sa.String(length=36),                       nullable=True))
        batch_op.add_column(sa.Column('approved_at',       sa.DateTime(),                              nullable=True))
        batch_op.add_column(sa.Column('approval_notes',    sa.Text(),                                  nullable=True))
        batch_op.create_foreign_key(None, 'users', ['approved_by_id'], ['id'])

    with op.batch_alter_table('referrals', schema=None) as batch_op:
        batch_op.add_column(sa.Column('expires_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Remove the additional columns."""
    with op.batch_alter_table('referrals', schema=None) as batch_op:
        batch_op.drop_column('expires_at')

    with op.batch_alter_table('campaigns', schema=None) as batch_op:
        batch_op.drop_column('approval_notes')
        batch_op.drop_column('approved_at')
        batch_op.drop_column('approved_by_id')
        batch_op.drop_column('approval_status')

    with op.batch_alter_table('ambassadors', schema=None) as batch_op:
        batch_op.drop_column('suspended_until')
        batch_op.drop_column('suspension_reason')
        batch_op.drop_column('fraud_strike_count')
        batch_op.drop_column('last_active_at')
        batch_op.drop_column('status')
        batch_op.drop_column('tier')
