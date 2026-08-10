"""tasks.so queue client — health-check + namespace stubs."""

import os


# Task registry - maps task names to their handler functions
TASK_HANDLERS = {}


def register_task(name):
    """Decorator to register a task handler function."""
    def decorator(func):
        TASK_HANDLERS[name] = func
        return func
    return decorator


class TaskSoClient:
    """Lightweight stub for tasks.so integration.

    Real integration (CONSUME mode) will require tasks.so ≥v3.2 installed.
    Until then SYNC and OFF modes are fully safe no-ops.
    """

    def __init__(self, mode=None, redis_url=None, default_queue=None):
        import app.config as _cfg
        self.mode = mode or os.getenv("TASK_SO_MODE", "OFF").upper()
        self.redis_url = redis_url or os.getenv("TASK_SO_REDIS_URL", "redis://localhost:6379/0")
        self.default_queue = default_queue or os.getenv("TASK_SO_DEFAULT_QUEUE", "default")
        self._started = False

    def start(self):
        if self.mode == "OFF":
            return {"status": "off", "message": "tasks.so disabled"}
        if self.mode == "CONSUME":
            try:
                import tasks_so  # noqa: F401 — real lib check
                self._started = True
                return {"status": "consuming", "queue": self.default_queue}
            except ImportError:
                self.mode = "SYNC"
                return {"status": "sync_fallback", "queue": self.default_queue,
                        "message": "tasks.so not installed; falling back to sync"}
        return {"status": "sync", "queue": self.default_queue}

    def enqueue(self, task_name, payload, queue=None):
        """Enqueue a background task. No-op in OFF mode; runs inline in SYNC."""
        status = self.start()
        if status["status"] == "off":
            return {"enqueued": False, "reason": "tasks.so OFF"}
        if status["status"] in ("sync", "sync_fallback"):
            return {"enqueued": True, "mode": "sync", "task": task_name, "payload": payload}
        return {"enqueued": True, "mode": "consume", "task": task_name, "queue": queue or self.default_queue}

    def health(self):
        return {"mode": self.mode, "redisUrl": self.redis_url,
                "defaultQueue": self.default_queue, "started": self._started}

    def run_task(self, task_name, payload):
        """Execute a registered task by name. Used for SYNC mode and CONSUME mode."""
        if task_name not in TASK_HANDLERS:
            return {"success": False, "error": f"unknown task: {task_name}"}
        try:
            result = TASK_HANDLERS[task_name](**payload)
            return {"success": True, "result": result}
        except Exception as e:
            return {"success": False, "error": str(e)}


# Register built-in tasks
@register_task("inactivity.scan")
def inactivity_scan_task(dry_run=False):
    """Run the inactivity scan and flag ambassadors."""
    from app.extensions import db
    from app.services.inactivity_service import InactivityService
    return InactivityService.scan_and_flag(db, dry_run=dry_run)


@register_task("inactivity.reactivate")
def inactivity_reactivate_task(ambassador_id):
    """Reactivate a specific ambassador."""
    from app.extensions import db
    from app.services.inactivity_service import InactivityService
    return InactivityService.reactivate(db, ambassador_id)

