"""add_platform_id_to_leads

Revision ID: 20260524_0145
Revises: 20260523_1517_4e3b2702c1d5
Create Date: 2026-05-24 01:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260524_0145'
down_revision = '4e3b2702c1d5'
branch_labels = None
depends_on = None


def upgrade():
    # Add platform_id column to leads table
    op.add_column('leads', sa.Column('platform_id', sa.String(36), nullable=False))
    # Create foreign key constraint
    op.create_foreign_key(
        'fk_leads_platform_id', 
        'leads', 
        'platform_types', 
        ['platform_id'], 
        ['id']
    )


def downgrade():
    # Drop foreign key constraint
    op.drop_constraint('fk_leads_platform_id', 'leads', type_='foreignkey')
    # Drop platform_id column
    op.drop_column('leads', 'platform_id')