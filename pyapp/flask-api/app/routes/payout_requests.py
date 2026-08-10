"""Payout requests CRUD."""

from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.middleware.auth import any_authenticated, require_roles
from flask_jwt_extended import get_jwt_identity
from app.models import User, Ambassador, PayoutRequest
from app.utils.serializers import to_dict

payout_requests_bp = Blueprint("payout_requests", __name__)
from app.controllers.payout_requests import PayoutRequestController


@payout_requests_bp.route("/payout-requests", methods=["GET"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER", "FINANCE_OFFICER", "AMBASSADOR")
def list_requests():
    identity = get_jwt_identity()
    user = db.session.get(User, identity)
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        if user and user.role.name == "AMBASSADOR":
            from sqlalchemy.orm import joinedload
            amb = db.session.query(Ambassador).filter_by(user_id=user.id).first()
            if amb:
                paginated = db.session.query(PayoutRequest).options(
                    joinedload(PayoutRequest.status),
                    joinedload(PayoutRequest.platform),
                    joinedload(PayoutRequest.ambassador),
                ).filter(
                    PayoutRequest.ambassador_id == amb.id
                ).order_by(PayoutRequest.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
                return ok({
                    "items": [to_dict(r, with_relations=True) for r in paginated.items],
                    "total": paginated.total,
                    "page": page,
                    "pages": paginated.pages,
                })
        result = PayoutRequestController.list_payout_requests(
            db, page=page, per_page=per_page,
            search=request.args.get('search', ''),
            platform_id=request.args.get('platform_id') or None
        )
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@payout_requests_bp.route("/payout-requests", methods=["POST"])
@any_authenticated
def create_request():
    from app.models import Ambassador
    data = request.get_json() or {}
    identity = get_jwt_identity()
    user = db.session.get(User, identity)
    if user and user.role.name == "AMBASSADOR":
        amb = db.session.query(Ambassador).filter_by(user_id=user.id).first()
        if amb:
            identity = amb.id
    try:
        result = PayoutRequestController.create_payout_request(db, data, ambassador_id=str(identity))
        return ok(result, "created", 201)
    except ValueError as e:
        return fail(str(e), 400)


@payout_requests_bp.route("/payout-requests/<uuid:pid>", methods=["PUT"])
@require_roles("SUPER_ADMIN", "FINANCE_OFFICER")
def review_request(pid):
    data = request.get_json() or {}
    identity = get_jwt_identity()
    try:
        result = PayoutRequestController.review_payout_request(db, str(pid), data, reviewed_by_id=identity)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@payout_requests_bp.route("/payout-requests/<uuid:pid>/edit", methods=["PUT"])
@require_roles("SUPER_ADMIN")
def update_request(pid):
    data = request.get_json() or {}
    identity = get_jwt_identity()
    try:
        result = PayoutRequestController.update_payout_request(db, str(pid), data, edited_by_id=identity)
        return ok(result, "payout request updated")
    except ValueError as e:
        return fail(str(e), 400)


@payout_requests_bp.route("/payout-requests/<uuid:pid>/authorize", methods=["POST"])
@require_roles("SUPER_ADMIN", "FINANCE_OFFICER")
def authorize_request(pid):
    data = request.get_json() or {}
    identity = get_jwt_identity()
    try:
        result = PayoutRequestController.authorize_payout_request(db, str(pid), data, reviewed_by_id=identity)
        return ok(result, "payout authorized")
    except ValueError as e:
        return fail(str(e), 400)


@payout_requests_bp.route("/payout-requests/<uuid:pid>/appeal", methods=["POST"])
@require_roles("AMBASSADOR")
def appeal_request(pid):
    from app.models import Ambassador
    data = request.get_json() or {}
    identity = get_jwt_identity()
    amb = db.session.query(Ambassador).filter_by(user_id=identity).first()
    if amb:
        identity = amb.id
    try:
        result = PayoutRequestController.appeal_payout_request(db, str(pid), data, ambassador_id=str(identity))
        return ok(result, "created", 201)
    except ValueError as e:
        return fail(str(e), 400)

