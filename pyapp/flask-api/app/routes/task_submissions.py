"""Task submissions CRUD."""

from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.middleware.auth import require_roles, any_authenticated
from flask_jwt_extended import get_jwt_identity

task_submissions_bp = Blueprint("task_submissions", __name__)
from app.controllers.task_submissions import TaskSubmissionController


@task_submissions_bp.route("/task-submissions", methods=["GET"])
@any_authenticated
def list_submissions():
    from app.models import User, Ambassador
    identity = get_jwt_identity()
    user = db.session.get(User, identity)
    actual_amb_id = identity
    if user and user.role.name == "AMBASSADOR":
        amb = db.session.query(Ambassador).filter_by(user_id=user.id).first()
        if amb:
            actual_amb_id = amb.id
    try:
        result = TaskSubmissionController.list_submissions(db, ambassador_id=str(actual_amb_id))
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


@task_submissions_bp.route("/task-submissions", methods=["POST"])
@require_roles("AMBASSADOR")
def create_submission():
    from app.models import Ambassador
    data = request.get_json() or {}
    identity = get_jwt_identity()
    amb = db.session.query(Ambassador).filter_by(user_id=identity).first()
    if not amb:
        return fail("ambassador not found", 404)
    try:
        result = TaskSubmissionController.create_submission(db, data, ambassador_id=amb.id)
        return ok(result, "created", 201)
    except ValueError as e:
        return fail(str(e), 400)


@task_submissions_bp.route("/task-submissions/<uuid:sid>", methods=["PUT"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER")
def update_submission(sid):
    data = request.get_json() or {}
    identity = get_jwt_identity()
    try:
        if "reviewedById" not in data:
          data["reviewedById"] = identity
        result = TaskSubmissionController.update_submission(db, str(sid), data)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


# New endpoint for reviewing task submissions (approve/reject)
@task_submissions_bp.route("/task-submissions/<uuid:sid>/review", methods=["PUT"])
@require_roles("SUPER_ADMIN", "HUB_MANAGER")
def review_submission(sid):
    data = request.get_json() or {}
    identity = get_jwt_identity()
    try:
        if "reviewedById" not in data:
            data["reviewedById"] = identity
        result = TaskSubmissionController.review_submission(db, str(sid), data)
        return ok(result)
    except ValueError as e:
        return fail(str(e), 400)


