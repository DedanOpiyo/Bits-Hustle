"""Check-ins / QR scan."""

from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.middleware.auth import any_authenticated
from flask_jwt_extended import get_jwt_identity
from app.models import Ambassador

check_ins_bp = Blueprint("check_ins", __name__)
from app.controllers.check_ins import CheckInController


@check_ins_bp.route("/check-ins", methods=["POST"])
@any_authenticated
def create_check_in():
    data = request.get_json() or {}
    identity = get_jwt_identity()
    amb = db.session.query(Ambassador).filter_by(user_id=identity).first()
    if amb:
        identity = amb.id
    override = data.pop("override", False)
    try:
        result = CheckInController.create_check_in(db, data, ambassador_id=identity, override=override)
        return ok(result, "created", 201)
    except ValueError as e:
        return fail(str(e), 400)


@check_ins_bp.route("/check-ins", methods=["GET"])
@any_authenticated
def list_check_ins():
    identity = get_jwt_identity()
    amb = db.session.query(Ambassador).filter_by(user_id=identity).first()
    if amb:
        identity = amb.id
    try:
        result = CheckInController.list_check_ins(db, ambassador_id=identity)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@check_ins_bp.route("/check-ins/<uuid:cid>/checkout", methods=["POST"])
@any_authenticated
def check_out(cid):
    identity = get_jwt_identity()
    try:
        result = CheckInController.check_out(db, str(cid), user_id=identity)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@check_ins_bp.route("/check-ins/scan", methods=["POST"])
@any_authenticated
def scan_check_in():
    data = request.get_json() or {}
    identity = get_jwt_identity()
    amb = db.session.query(Ambassador).filter_by(user_id=identity).first()
    if amb:
        identity = amb.id
    override = data.pop("override", False)
    try:
        result = CheckInController.scan_check_in(db, payload=data, ambassador_id=identity, override=override)
        return ok(result, "checked in", 201)
    except ValueError as e:
        return fail(str(e), 400)


@check_ins_bp.route("/check-ins/hub/<uuid:hub_id>", methods=["GET"])
@any_authenticated
def get_hub_attendance(hub_id):
    from app.models import User, Hub
    identity = get_jwt_identity()
    user = db.session.get(User, identity)
    if not user:
        return fail("user not found", 404)
    is_super_admin = user.role and user.role.name == "SUPER_ADMIN"
    is_hub_manager = user.role and user.role.name == "HUB_MANAGER"
    if not is_super_admin and not is_hub_manager:
        return fail("permission denied", 403)
    if is_hub_manager:
        managed_hub = db.session.query(Hub).filter_by(manager_id=identity).first()
        if not managed_hub or str(managed_hub.id) != str(hub_id):
            return fail("you can only view attendance for your assigned hub", 403)
    date = request.args.get("date")
    try:
        result = CheckInController.get_hub_attendance(db, str(hub_id), date=date)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@check_ins_bp.route("/check-ins/hub/<uuid:hub_id>/trends", methods=["GET"])
@any_authenticated
def get_hub_attendance_trends(hub_id):
    from app.models import User, Hub
    identity = get_jwt_identity()
    user = db.session.get(User, identity)
    if not user:
        return fail("user not found", 404)
    is_super_admin = user.role and user.role.name == "SUPER_ADMIN"
    is_hub_manager = user.role and user.role.name == "HUB_MANAGER"
    if not is_super_admin and not is_hub_manager:
        return fail("permission denied", 403)
    if is_hub_manager:
        managed_hub = db.session.query(Hub).filter_by(manager_id=identity).first()
        if not managed_hub or str(managed_hub.id) != str(hub_id):
            return fail("you can only view attendance for your assigned hub", 403)
    days = request.args.get("days", 7, type=int)
    try:
        result = CheckInController.get_hub_attendance_trends(db, str(hub_id), days=days)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)
