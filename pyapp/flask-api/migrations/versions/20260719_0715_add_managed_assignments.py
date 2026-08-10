"""add managed assignments workflow fields

Revision ID: 20260719_0715
Revises: 20260612_0050
Create Date: 2026-07-19 07:15:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260719_0715_add_managed_assignments"
down_revision = "20260612_0050_add_webhook_secret_to_platforms"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if "assignments" not in tables:
        op.create_table(
            "assignments",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("budget", sa.Float(), nullable=False),
            sa.Column("deadline", sa.DateTime(), nullable=False),
            sa.Column("category", sa.String(length=100), nullable=False),
            sa.Column("status", sa.String(length=50), nullable=False),
            sa.Column("priority", sa.String(length=20), nullable=False),
            sa.Column("client_id", sa.String(length=36), nullable=False),
            sa.Column("worker_id", sa.String(length=36), nullable=True),
            sa.Column("assigned_by_id", sa.String(length=36), nullable=True),
            sa.Column("assigned_at", sa.DateTime(), nullable=True),
            sa.Column("reviewed_by_id", sa.String(length=36), nullable=True),
            sa.Column("reviewed_at", sa.DateTime(), nullable=True),
            sa.Column("admin_notes", sa.Text(), nullable=True),
            sa.Column("revision_notes", sa.Text(), nullable=True),
            sa.Column("files", sa.JSON(), nullable=True),
            sa.Column("timeline", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["assigned_by_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["client_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["reviewed_by_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["worker_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
    else:
        existing = {column["name"] for column in inspector.get_columns("assignments")}
        with op.batch_alter_table("assignments") as batch_op:
            if "assigned_by_id" not in existing:
                batch_op.add_column(sa.Column("assigned_by_id", sa.String(length=36), nullable=True))
                batch_op.create_foreign_key("fk_assignments_assigned_by_id_users", "users", ["assigned_by_id"], ["id"])
            if "assigned_at" not in existing:
                batch_op.add_column(sa.Column("assigned_at", sa.DateTime(), nullable=True))
            if "reviewed_by_id" not in existing:
                batch_op.add_column(sa.Column("reviewed_by_id", sa.String(length=36), nullable=True))
                batch_op.create_foreign_key("fk_assignments_reviewed_by_id_users", "users", ["reviewed_by_id"], ["id"])
            if "reviewed_at" not in existing:
                batch_op.add_column(sa.Column("reviewed_at", sa.DateTime(), nullable=True))
            if "revision_notes" not in existing:
                batch_op.add_column(sa.Column("revision_notes", sa.Text(), nullable=True))
            if "client_name" not in existing:
                batch_op.add_column(sa.Column("client_name", sa.String(length=255), nullable=True))
            if "client_email" not in existing:
                batch_op.add_column(sa.Column("client_email", sa.String(length=255), nullable=True))
            if "client_phone" not in existing:
                batch_op.add_column(sa.Column("client_phone", sa.String(length=50), nullable=True))
            if "timeline" not in existing:
                batch_op.add_column(sa.Column("timeline", sa.JSON(), nullable=True))

    if "submissions" not in tables:
        op.create_table(
            "submissions",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("assignment_id", sa.String(length=36), nullable=False),
            sa.Column("worker_id", sa.String(length=36), nullable=False),
            sa.Column("deliverable_file", sa.Text(), nullable=True),
            sa.Column("deliverable_link", sa.Text(), nullable=True),
            sa.Column("submission_notes", sa.Text(), nullable=True),
            sa.Column("submitted_at", sa.DateTime(), nullable=True),
            sa.Column("status", sa.String(length=50), nullable=False),
            sa.Column("review_notes", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(["assignment_id"], ["assignments.id"]),
            sa.ForeignKeyConstraint(["worker_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
    else:
        existing = {column["name"] for column in inspector.get_columns("submissions")}
        if "review_notes" not in existing:
            with op.batch_alter_table("submissions") as batch_op:
                batch_op.add_column(sa.Column("review_notes", sa.Text(), nullable=True))


def downgrade():
    op.drop_table("submissions")
    op.drop_table("assignments")
