"""Tasks CRUD."""

from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.middleware.auth import require_roles

tasks_bp = Blueprint("tasks", __name__)
from app.controllers.tasks import TaskController


@tasks_bp.route("/tasks", methods=["GET"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER", "AMBASSADOR")
def list_tasks():
    try:
        result = TaskController.list_tasks(db)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@tasks_bp.route("/tasks", methods=["POST"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER", "PARTNER_ADVERTISER")
def create_task():
    data = request.get_json() or {}
    try:
        result = TaskController.create_task(db, data)
        return ok(result, "created", 201)
    except ValueError as e:
        return fail(str(e), 400)


@tasks_bp.route("/tasks/<uuid:tid>", methods=["GET"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER", "AMBASSADOR")
def get_task(tid):
    try:
        result = TaskController.get_task(db, str(tid))
        return ok(result)
    except ValueError as e:
        return fail(str(e), 404)


@tasks_bp.route("/tasks/<uuid:tid>", methods=["PUT"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER")
def update_task(tid):
    data = request.get_json() or {}
    try:
        result = TaskController.update_task(db, str(tid), data)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@tasks_bp.route("/tasks/<uuid:tid>", methods=["DELETE"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER")
def delete_task(tid):
    try:
        TaskController.delete_task(db, str(tid))
        return ok({"message": "task deleted"})
    except ValueError as e:
        return fail(str(e), 404)


