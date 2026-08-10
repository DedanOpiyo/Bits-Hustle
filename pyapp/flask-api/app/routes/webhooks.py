from flask import Blueprint, request
from app.extensions import db
from app.utils.responses import ok, fail
from app.services.webhook_service import WebhookService
from app.services.webhook_metrics_service import WebhookMetricsService
from app.services.payout_request_service import PayoutRequestService
from app.middleware.rate_limit import webhook_rate_limit

webhooks_bp = Blueprint("webhooks", __name__)


class WebhookController:
    @staticmethod
    def handle_external_conversion():
        data = request.get_json(silent=True) or {}
        if not data:
            WebhookMetricsService.record_event(False, 400, "request body required")
            return fail("request body required", 400)

        signature = request.headers.get("X-Webhook-Signature", "")
        timestamp = data.get("timestamp", "")

        if not signature:
            WebhookMetricsService.record_event(False, 401, "signature required")
            return fail("signature required", 401)

        if not WebhookService.verify_signature(db, data, signature, timestamp):
            WebhookMetricsService.record_event(False, 401, "invalid signature")
            return fail("invalid signature", 401)

        try:
            result = WebhookService.process_conversion(db, data)
            WebhookService.log_webhook_attempt(db, data, True)
            WebhookMetricsService.record_event(True, 200)
            return ok(result, "conversion processed", 200)
        except ValueError as e:
            WebhookService.log_webhook_attempt(db, data, False, str(e))
            status = 409 if "already processed" in str(e) else 400 if "required" in str(e) else 404
            WebhookMetricsService.record_event(False, status, str(e))
            return fail(str(e), status)
        except Exception as e:
            WebhookService.log_webhook_attempt(db, data, False, str(e))
            WebhookMetricsService.record_event(False, 500, str(e))
            return fail("internal error", 500)

    @staticmethod
    def handle_external_lead_status():
        data = request.get_json(silent=True) or {}
        if not data:
            WebhookMetricsService.record_event(False, 400, "request body required")
            return fail("request body required", 400)

        signature = request.headers.get("X-Webhook-Signature", "")
        timestamp = data.get("timestamp", "")

        if not signature:
            WebhookMetricsService.record_event(False, 401, "signature required")
            return fail("signature required", 401)

        if not WebhookService.verify_signature(db, data, signature, timestamp):
            WebhookMetricsService.record_event(False, 401, "invalid signature")
            return fail("invalid signature", 401)

        try:
            result = WebhookService.process_lead_status(db, data)
            WebhookService.log_webhook_attempt(db, data, True)
            WebhookMetricsService.record_event(True, 200)
            return ok(result, "lead status processed", 200)
        except ValueError as e:
            WebhookService.log_webhook_attempt(db, data, False, str(e))
            status = 400 if "required" in str(e) else 404
            WebhookMetricsService.record_event(False, status, str(e))
            return fail(str(e), status)
        except Exception as e:
            WebhookService.log_webhook_attempt(db, data, False, str(e))
            WebhookMetricsService.record_event(False, 500, str(e))
            return fail("internal error", 500)

    @staticmethod
    def get_metrics():
        """Get webhook metrics (admin only)."""
        metrics = WebhookMetricsService.get_metrics()
        return ok(metrics, "webhook metrics")

    @staticmethod
    def handle_b2c_result():
        data = request.get_json(silent=True) or {}
        if not data:
            return fail("request body required", 400)
        try:
            result = PayoutRequestService.process_b2c_result_callback(db, data)
            return ok(result, "B2C result callback processed", 200)
        except Exception as e:
            return fail(str(e), 500)

    @staticmethod
    def handle_b2c_timeout():
        data = request.get_json(silent=True) or {}
        if not data:
            return fail("request body required", 400)
        try:
            result = PayoutRequestService.process_b2c_timeout_callback(db, data)
            return ok(result, "B2C timeout callback processed", 200)
        except Exception as e:
            return fail(str(e), 500)


@webhooks_bp.route("/webhooks/external-conversion", methods=["POST"])
@webhook_rate_limit(max_requests=100, window_seconds=60)
def handle_external_conversion():
    return WebhookController.handle_external_conversion()


@webhooks_bp.route("/webhooks/external-lead-status", methods=["POST"])
@webhook_rate_limit(max_requests=100, window_seconds=60)
def handle_external_lead_status():
    return WebhookController.handle_external_lead_status()


@webhooks_bp.route("/webhooks/metrics", methods=["GET"])
def webhook_metrics():
    return WebhookController.get_metrics()


@webhooks_bp.route("/webhooks/mpesa/b2c/result", methods=["POST"])
@webhook_rate_limit(max_requests=200, window_seconds=60)
def handle_b2c_result():
    return WebhookController.handle_b2c_result()


@webhooks_bp.route("/webhooks/mpesa/b2c/timeout", methods=["POST"])
@webhook_rate_limit(max_requests=200, window_seconds=60)
def handle_b2c_timeout():
    return WebhookController.handle_b2c_timeout()

