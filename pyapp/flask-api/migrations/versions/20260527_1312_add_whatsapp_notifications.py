"""Add whatsapp_notifications column to user_settings

Revision ID: 20260527_1312_add_whatsapp_notifications
Revises: previous_revision
Create Date: 2026-05-27 13:12:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_whatsapp_notifications'
down_revision = '5c03f6d81dda'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('user_settings', sa.Column('whatsapp_notifications', sa.Boolean(), nullable=True, server_default='0'))


def downgrade():
    op.drop_column('user_settings', 'whatsapp_notifications')
