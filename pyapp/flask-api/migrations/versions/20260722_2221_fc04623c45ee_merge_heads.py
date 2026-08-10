"""merge heads

Revision ID: fc04623c45ee
Revises: 20260719_0744_add_assignment_messages, 20260722_0400_add_assignment_categories
Create Date: 2026-07-22 22:21:31.102725

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fc04623c45ee'
down_revision = ('20260719_0744_add_assignment_messages', '20260722_0400_add_assignment_categories')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
