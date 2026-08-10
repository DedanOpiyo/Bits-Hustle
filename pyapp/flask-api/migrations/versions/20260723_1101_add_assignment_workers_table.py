"""add_assignment_workers_table

Revision ID: 20260723_1101_add_assignment_workers_table
Revises: ff1837940524
Create Date: 2026-07-23 11:01:24.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260723_1101_add_assignment_workers_table"
down_revision = "ff1837940524"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if "assignment_workers" not in tables:
        op.create_table(
            "assignment_workers",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_assignment_workers_user_id_users"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", name="uq_assignment_workers_user_id"),
        )


def downgrade():
    op.drop_table("assignment_workers")
