"""empty message

Revision ID: 0e9f89204986
Revises: add_whatsapp_notifications, 20260527_1545_add_is_percentage_to_referral_rates
Create Date: 2026-05-29 14:39:08.163008

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0e9f89204986'
down_revision = ('add_whatsapp_notifications', '20260527_1545_add_is_percentage_to_referral_rates')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
