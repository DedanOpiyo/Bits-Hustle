"""Lead status types routes."""

from flask import Blueprint
from app.extensions import db
from app.utils.responses import ok, fail

lead_status_types_bp = Blueprint("lead_status_types", __name__)


@lead_status_types_bp.route("/lead-status-types", methods=["GET"])
def get_lead_status_types():
    try:
        from app.controllers.lead_status_types import LeadStatusTypeController
        result = LeadStatusTypeController.list_lead_status_types(db)
        return ok(result)
    except Exception as e:
        return fail(str(e), 500)
