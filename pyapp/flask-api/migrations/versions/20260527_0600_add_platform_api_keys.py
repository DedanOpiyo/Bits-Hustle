"""add platform_api_keys and action_types platform support

Revision ID: 20260527_0600
Revises: add_tier_action_types
Create Date: 2026-05-27 06:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260527_0600_add_platform_api_keys'
down_revision = '20260527_0540_add_tier_action_types'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    tables = conn.execute(sa.text("SHOW TABLES")).fetchall()
    existing_tables = {row[0] for row in tables}
    
    # ── platform_api_keys table ──
    if 'platform_api_keys' not in existing_tables:
        op.create_table(
            'platform_api_keys',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('platform_id', sa.String(36), sa.ForeignKey('platform_types.id'), nullable=False),
            sa.Column('name', sa.String(128), nullable=False),
            sa.Column('key_hash', sa.String(255), nullable=False),
            sa.Column('key_prefix', sa.String(8), nullable=False),
            sa.Column('is_active', sa.Boolean, server_default='1'),
            sa.Column('scopes', sa.JSON, nullable=True),
            sa.Column('last_used_at', sa.DateTime, nullable=True),
            sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        )

    # ── action_types: add platform_id, is_approved, created_by_key_id ──
    columns = conn.execute(sa.text("SHOW COLUMNS FROM action_types")).fetchall()
    existing_cols = {row[0] for row in columns}
    
    if 'platform_id' not in existing_cols:
        op.add_column('action_types', sa.Column('platform_id', sa.String(36), sa.ForeignKey('platform_types.id'), nullable=True))
    if 'is_approved' not in existing_cols:
        op.add_column('action_types', sa.Column('is_approved', sa.Boolean, server_default='1'))
    if 'created_by_key_id' not in existing_cols:
        op.add_column('action_types', sa.Column('created_by_key_id', sa.String(36), sa.ForeignKey('platform_api_keys.id'), nullable=True))


def downgrade():
    conn = op.get_bind()
    
    # Drop columns if they exist
    columns = conn.execute(sa.text("SHOW COLUMNS FROM action_types")).fetchall()
    existing_cols = {row[0] for row in columns}
    
    if 'created_by_key_id' in existing_cols:
        op.drop_column('action_types', 'created_by_key_id')
    if 'is_approved' in existing_cols:
        op.drop_column('action_types', 'is_approved')
    if 'platform_id' in existing_cols:
        op.drop_column('action_types', 'platform_id')
    
    tables = conn.execute(sa.text("SHOW TABLES")).fetchall()
    existing_tables = {row[0] for row in tables}
    if 'platform_api_keys' in existing_tables:
        op.drop_table('platform_api_keys')
