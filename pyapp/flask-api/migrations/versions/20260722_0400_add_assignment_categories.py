"""add assignment categories lookup table

Revision ID: 20260722_0400_add_assignment_categories
Revises: 20260719_0715_add_managed_assignments
Create Date: 2026-07-22 04:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260722_0400_add_assignment_categories"
down_revision = "20260719_0715_add_managed_assignments"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "assignment_categories",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("display_name", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )


def downgrade():
    op.drop_table("assignment_categories")
