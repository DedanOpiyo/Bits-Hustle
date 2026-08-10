"""Audit logs."""

from flask import Blueprint
from app.extensions import db
from app.utils.responses import ok, fail
from app.middleware.auth import require_roles

audit_logs_bp = Blueprint("audit_logs", __name__)
from app.controllers.audit_logs import AuditLogController


@audit_logs_bp.route("/audit-logs", methods=["GET"])
@require_roles("SUPER_ADMIN")
def list_logs():
    try:
        result = AuditLogController.list_audit_logs(db, page=1, per_page=200)
        return ok(result["items"])
    except ValueError as e:
        return fail(str(e), 400)

