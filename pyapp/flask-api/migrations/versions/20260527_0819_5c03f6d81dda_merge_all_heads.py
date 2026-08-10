"""merge all heads

Revision ID: 5c03f6d81dda
Revises: 20260527_0600_add_platform_api_keys, 20260527_0609_add_password_mgmt_columns, 1eeb385e6304
Create Date: 2026-05-27 08:19:52.878047

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5c03f6d81dda'
down_revision = ('20260527_0600_add_platform_api_keys', '20260527_0609_add_password_mgmt_columns', '1eeb385e6304')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
