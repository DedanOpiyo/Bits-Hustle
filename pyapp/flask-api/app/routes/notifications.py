"""Notifications CRUD."""

from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.middleware.auth import any_authenticated
from flask_jwt_extended import get_jwt_identity

notifications_bp = Blueprint("notifications", __name__)
from app.controllers.notifications import NotificationController


@notifications_bp.route("/notifications", methods=["GET"])
@any_authenticated
def get_notifications():
    identity = get_jwt_identity()
    user_only = request.args.get("userOnly", "false").lower() == "true"
    try:
        if user_only:
            result = NotificationController.get_notifications(db, user_id=identity)
        else:
            result = NotificationController.get_notifications(db, user_id=None)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@notifications_bp.route("/notifications/<uuid:nid>/read", methods=["PUT"])
@any_authenticated
def mark_read(nid):
    identity = get_jwt_identity()
    try:
        result = NotificationController.mark_notification_read(db, str(nid), user_id=identity)
        return ok(result)
    except ValueError as e:
        message = str(e)
        if message == "not found":
            return fail(message, 404)
        if message == "forbidden":
            return fail(message, 403)
        return fail(message, 400)


@notifications_bp.route("/notifications/<uuid:nid>", methods=["DELETE"])
@any_authenticated
def delete_notification(nid):
    identity = get_jwt_identity()
    try:
        NotificationController.delete_notification(db, str(nid), user_id=identity)
        return ok({"message": "notification deleted"})
    except ValueError as e:
        message = str(e)
        if message == "not found":
            return fail(message, 404)
        if message == "forbidden":
            return fail(message, 403)
        return fail(message, 400)

