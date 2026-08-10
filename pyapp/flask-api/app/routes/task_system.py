"""tasks.so integration health-check + enqueue stub."""

from flask import Blueprint, request, current_app
from app.extensions import db
from app.utils.responses import ok, fail

task_system_bp = Blueprint("task_system", __name__)


@task_system_bp.route("/task-so/health", methods=["GET"])
def task_so_health():
    try:
        from app.services.task_so_sync import TaskSoClient
        from app.config import task_so_config
        client = TaskSoClient(
            mode=task_so_config.mode,
            redis_url=task_so_config.redis_url,
            default_queue=task_so_config.default_queue,
        )
        return ok(client.health())
    except Exception as e:
        return fail(str(e), 500)


@task_system_bp.route("/task-so/enqueue", methods=["POST"])
def task_so_enqueue():
    data = request.get_json() or {}
    task_name = data.get("task")
    payload = data.get("payload", {})
    if not task_name:
        return fail("task name required", 400)
    try:
        from app.services.task_so_sync import TaskSoClient
        from app.config import task_so_config
        client = TaskSoClient(
            mode=task_so_config.mode,
            redis_url=task_so_config.redis_url,
            default_queue=task_so_config.default_queue,
        )
        result = client.enqueue(task_name, payload)
        # In SYNC mode, also execute the task
        if result.get("mode") == "sync":
            exec_result = client.run_task(task_name, payload)
            result["execution"] = exec_result
        return ok(result)
    except Exception as e:
        return fail(str(e), 500)


@task_system_bp.route("/task-so/run", methods=["POST"])
def task_so_run():
    """Run a task synchronously regardless of mode."""
    data = request.get_json() or {}
    task_name = data.get("task")
    payload = data.get("payload", {})
    if not task_name:
        return fail("task name required", 400)
    try:
        from app.services.task_so_sync import TaskSoClient
        client = TaskSoClient(mode="SYNC")
        result = client.run_task(task_name, payload)
        return ok(result)
    except Exception as e:
        return fail(str(e), 500)


@task_system_bp.route("/inactivity/scan", methods=["POST"])
def inactivity_scan():
    """Run inactivity scan - flags ambassadors inactive for > INACTIVITY_DAYS."""
    try:
        from app.services.inactivity_service import InactivityService
        dry_run = request.args.get("dry_run", "false").lower() == "true"
        result = InactivityService.scan_and_flag(db, dry_run=dry_run)
        return ok(result)
    except Exception as e:
        return fail(str(e), 500)


@task_system_bp.route("/inactivity/reactivate/<ambassador_id>", methods=["POST"])
def inactivity_reactivate(ambassador_id):
    """Reactivate a specific ambassador."""
    try:
        from app.services.inactivity_service import InactivityService
        result = InactivityService.reactivate(db, ambassador_id)
        return ok(result)
    except Exception as e:
        return fail(str(e), 500)

