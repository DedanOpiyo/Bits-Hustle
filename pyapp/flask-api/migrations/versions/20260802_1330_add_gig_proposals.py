"""add gig proposals and assignment negotiation fields

Revision ID: 20260802_1330_add_gig_proposals
Revises: 20260723_1101_add_assignment_workers_table
Create Date: 2026-08-02 13:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260802_1330_add_gig_proposals"
down_revision = "20260723_1101_add_assignment_workers_table"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if "assignments" in tables:
        existing = {column["name"] for column in inspector.get_columns("assignments")}
        with op.batch_alter_table("assignments") as batch_op:
            if "final_price" not in existing:
                batch_op.add_column(sa.Column("final_price", sa.Float(), nullable=True))
            if "selected_proposal_id" not in existing:
                batch_op.add_column(sa.Column("selected_proposal_id", sa.String(length=36), nullable=True))
            if "client_amendment_notes" not in existing:
                batch_op.add_column(sa.Column("client_amendment_notes", sa.Text(), nullable=True))
            if "negotiation_notes" not in existing:
                batch_op.add_column(sa.Column("negotiation_notes", sa.Text(), nullable=True))

    if "gig_proposals" not in tables:
        op.create_table(
            "gig_proposals",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("assignment_id", sa.String(length=36), nullable=False),
            sa.Column("worker_id", sa.String(length=36), nullable=False),
            sa.Column("proposed_amount", sa.Float(), nullable=False),
            sa.Column("adjusted_amount", sa.Float(), nullable=True),
            sa.Column("final_amount", sa.Float(), nullable=True),
            sa.Column("cover_letter", sa.Text(), nullable=False),
            sa.Column("estimated_days", sa.Integer(), nullable=True),
            sa.Column("status", sa.String(length=50), nullable=False),
            sa.Column("admin_notes", sa.Text(), nullable=True),
            sa.Column("rejection_reason", sa.Text(), nullable=True),
            sa.Column("price_adjust_type", sa.String(length=20), nullable=True),
            sa.Column("price_adjust_value", sa.Float(), nullable=True),
            sa.Column("reviewed_by_id", sa.String(length=36), nullable=True),
            sa.Column("reviewed_at", sa.DateTime(), nullable=True),
            sa.Column("sent_to_client_at", sa.DateTime(), nullable=True),
            sa.Column("client_selected_at", sa.DateTime(), nullable=True),
            sa.Column("client_amendment", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["assignment_id"], ["assignments.id"]),
            sa.ForeignKeyConstraint(["worker_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["reviewed_by_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("assignment_id", "worker_id", name="uq_gig_proposal_assignment_worker"),
        )


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if "gig_proposals" in tables:
        op.drop_table("gig_proposals")

    if "assignments" in tables:
        existing = {column["name"] for column in inspector.get_columns("assignments")}
        with op.batch_alter_table("assignments") as batch_op:
            if "negotiation_notes" in existing:
                batch_op.drop_column("negotiation_notes")
            if "client_amendment_notes" in existing:
                batch_op.drop_column("client_amendment_notes")
            if "selected_proposal_id" in existing:
                batch_op.drop_column("selected_proposal_id")
            if "final_price" in existing:
                batch_op.drop_column("final_price")
