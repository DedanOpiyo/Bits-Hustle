"""add assignment messages

Revision ID: 20260719_0744_add_assignment_messages
Revises: 20260719_0715_add_managed_assignments
Create Date: 2026-07-19 07:44:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260719_0744_add_assignment_messages"
down_revision = "20260719_0715_add_managed_assignments"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "assignment_messages" not in inspector.get_table_names():
        op.create_table(
            "assignment_messages",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("assignment_id", sa.String(length=36), nullable=False),
            sa.Column("sender_id", sa.String(length=36), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("visibility", sa.String(length=32), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["assignment_id"], ["assignments.id"]),
            sa.ForeignKeyConstraint(["sender_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )


def downgrade():
    op.drop_table("assignment_messages")
