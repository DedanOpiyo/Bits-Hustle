"""add tier_types and action_types tables

Revision ID: 20260527_0540_add_tier_action_types
Revises: 20260527_0512
Create Date: 2026-05-27 05:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260527_0540_add_tier_action_types'
down_revision = '20260527_0512'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'tier_types',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(64), unique=True, nullable=False),
        sa.Column('display_name', sa.String(128), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('sort_order', sa.Integer, server_default='0'),
        sa.Column('is_active', sa.Boolean, server_default='1'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        'action_types',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(64), unique=True, nullable=False),
        sa.Column('display_name', sa.String(128), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('sort_order', sa.Integer, server_default='0'),
        sa.Column('is_active', sa.Boolean, server_default='1'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Seed default tiers
    op.bulk_insert(
        sa.table('tier_types',
            sa.column('id', sa.String),
            sa.column('name', sa.String),
            sa.column('display_name', sa.String),
            sa.column('description', sa.String),
            sa.column('sort_order', sa.Integer),
            sa.column('is_active', sa.Boolean),
        ),
        [
            {'id': 'tier-default', 'name': 'DEFAULT', 'display_name': 'Default', 'description': 'Default tier for all referrals', 'sort_order': 0, 'is_active': True},
            {'id': 'tier-1', 'name': 'TIER_1', 'display_name': 'Tier 1', 'description': 'First level referral tier', 'sort_order': 1, 'is_active': True},
            {'id': 'tier-2', 'name': 'TIER_2', 'display_name': 'Tier 2', 'description': 'Second level referral tier', 'sort_order': 2, 'is_active': True},
            {'id': 'tier-3', 'name': 'TIER_3', 'display_name': 'Tier 3', 'description': 'Third level referral tier', 'sort_order': 3, 'is_active': True},
        ]
    )

    # Seed default actions
    op.bulk_insert(
        sa.table('action_types',
            sa.column('id', sa.String),
            sa.column('name', sa.String),
            sa.column('display_name', sa.String),
            sa.column('description', sa.String),
            sa.column('sort_order', sa.Integer),
            sa.column('is_active', sa.Boolean),
        ),
        [
            {'id': 'action-signup', 'name': 'SIGNUP', 'display_name': 'Sign Up', 'description': 'User signs up through referral', 'sort_order': 0, 'is_active': True},
            {'id': 'action-purchase', 'name': 'PURCHASE', 'display_name': 'Purchase', 'description': 'User makes a purchase', 'sort_order': 1, 'is_active': True},
            {'id': 'action-library', 'name': 'LIBRARY', 'display_name': 'Library', 'description': 'User accesses library content', 'sort_order': 2, 'is_active': True},
            {'id': 'action-conversion', 'name': 'CONVERSION', 'display_name': 'Conversion', 'description': 'User completes conversion action', 'sort_order': 3, 'is_active': True},
        ]
    )


def downgrade():
    op.drop_table('action_types')
    op.drop_table('tier_types')
