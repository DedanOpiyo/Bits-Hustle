"""Task type types routes."""

from flask import Blueprint
from app.extensions import db
from app.utils.responses import ok, fail

task_type_types_bp = Blueprint("task_type_types", __name__)


@task_type_types_bp.route("/task-type-types", methods=["GET"])
def get_task_type_types():
    try:
        from app.controllers.task_type_types import TaskTypeTypeController
        result = TaskTypeTypeController.list_task_type_types(db)
        return ok(result)
    except Exception as e:
        return fail(str(e), 500)
