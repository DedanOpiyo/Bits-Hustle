"""Support tickets CRUD."""

from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.middleware.auth import any_authenticated, require_roles
from flask_jwt_extended import get_jwt_identity

support_tickets_bp = Blueprint("support_tickets", __name__)
from app.controllers.support_tickets import SupportTicketController


@support_tickets_bp.route("/support-tickets", methods=["GET"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER", "SUPPORT_OFFICER")
def list_tickets():
    try:
        result = SupportTicketController.list_support_tickets(db)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@support_tickets_bp.route("/my-support-tickets", methods=["GET"])
@any_authenticated
def my_tickets():
    identity = get_jwt_identity()
    try:
        result = SupportTicketController.list_my_tickets(db, ambassador_id=identity)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@support_tickets_bp.route("/support-tickets", methods=["POST"])
@any_authenticated
def create_ticket():
    data = request.get_json() or {}
    identity = get_jwt_identity()
    try:
        result = SupportTicketController.create_ticket(db, data, ambassador_id=identity)
        return ok(result, "created", 201)
    except ValueError as e:
        return fail(str(e), 400)


@support_tickets_bp.route("/support-tickets/<uuid:tid>", methods=["PUT"])
@any_authenticated
def update_ticket(tid):
    data = request.get_json() or {}
    try:
        result = SupportTicketController.update_support_ticket(db, str(tid), data)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@support_tickets_bp.route("/support-tickets/<uuid:tid>/escalate", methods=["POST"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER", "SUPPORT_OFFICER")
def escalate_ticket(tid):
    data = request.get_json() or {}
    try:
        result = SupportTicketController.escalate_ticket(db, str(tid), data)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@support_tickets_bp.route("/support-tickets/check-escalations", methods=["POST"])
@require_roles("SUPER_ADMIN")
def check_escalations():
    try:
        result = SupportTicketController.check_escalations(db)
        return ok({"escalated": result})
    except ValueError as e:
        return fail(str(e), 400)


