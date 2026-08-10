"""Webhook metrics collection and reporting service."""
import json
import os
from datetime import datetime, timezone
from typing import Optional


# In-memory metrics store (use Redis/DB in production)
_metrics = {
    "total_requests": 0,
    "successful": 0,
    "failed": 0,
    "by_status": {},
    "last_hour": [],
}

_LOGS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "logs")
_ERROR_LOG_FILE = os.path.join(_LOGS_DIR, "webhook_errors.log")


class WebhookMetricsService:
    @staticmethod
    def record_event(success: bool, status_code: int = 0, error: Optional[str] = None):
        """Record a webhook event for metrics."""
        _metrics["total_requests"] += 1

        if success:
            _metrics["successful"] += 1
        else:
            _metrics["failed"] += 1

        if status_code:
            status_key = str(status_code)
            _metrics["by_status"][status_key] = _metrics["by_status"].get(status_key, 0) + 1

        _metrics["last_hour"].append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "success": success,
            "status_code": status_code,
            "error": error or "",
        })

        if not success and error:
            WebhookMetricsService._persist_error(status_code, error)

    @staticmethod
    def _persist_error(status_code: int, error: str):
        """Write error details to a persistent log file."""
        try:
            os.makedirs(_LOGS_DIR, exist_ok=True)
            entry = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status_code": status_code,
                "error": error,
            }
            with open(_ERROR_LOG_FILE, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry) + "\n")
        except Exception:
            pass

    @staticmethod
    def get_metrics():
        """Get current webhook metrics."""
        total = _metrics["total_requests"] or 1
        return {
            "total_requests": _metrics["total_requests"],
            "successful": _metrics["successful"],
            "failed": _metrics["failed"],
            "success_rate": round(_metrics["successful"] / total * 100, 2),
            "failure_rate": round(_metrics["failed"] / total * 100, 2),
            "by_status": _metrics["by_status"],
            "last_hour_count": len(_metrics["last_hour"]),
        }

    @staticmethod
    def reset():
        """Reset metrics (for testing)."""
        global _metrics
        _metrics = {
            "total_requests": 0,
            "successful": 0,
            "failed": 0,
            "by_status": {},
            "last_hour": [],
        }
