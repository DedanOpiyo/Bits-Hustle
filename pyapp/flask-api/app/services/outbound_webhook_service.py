"""Outbound webhook service — sends events from B2H to partner platforms."""
import hmac
import hashlib
import json
import requests
from datetime import datetime, timezone
from flask import current_app


class OutboundWebhookService:
    @staticmethod
    def sign_payload(payload: dict, secret: str) -> str:
        payload_str = json.dumps(payload, separators=(",", ":"), sort_keys=True)
        return hmac.new(
            secret.encode("utf-8"),
            payload_str.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    @staticmethod
    def send_event(db, platform_id: str, event_type: str, data: dict) -> dict:
        """Send an event webhook to a partner platform.

        Args:
            db: SQLAlchemy session
            platform_id: The platform to notify
            event_type: e.g. "action.approved", "commission.paid"
            data: Event payload data

        Returns:
            dict with keys: success (bool), status_code (int), error (str)
        """
        from app.models import PlatformType

        platform = db.session.get(PlatformType, platform_id)
        if not platform:
            return {"success": False, "error": "platform not found"}

        if not platform.webhook_url:
            return {"success": False, "error": "no webhook_url configured"}

        if not platform.webhook_secret:
            return {"success": False, "error": "no webhook_secret configured"}

        payload = {
            "event_type": event_type,
            "platform_id": platform_id,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "data": data,
        }

        signature = OutboundWebhookService.sign_payload(payload, platform.webhook_secret)

        headers = {
            "Content-Type": "application/json",
            "X-B2H-Signature": signature,
            "X-B2H-Event": event_type,
        }

        try:
            resp = requests.post(
                platform.webhook_url,
                json=payload,
                headers=headers,
                timeout=current_app.config.get("WEBHOOK_TIMEOUT", 10),
            )
            return {
                "success": resp.status_code < 400,
                "status_code": resp.status_code,
                "error": "" if resp.status_code < 400 else resp.text[:200],
            }
        except requests.RequestException as e:
            return {"success": False, "error": str(e)}

    @staticmethod
    def notify_action_approved(db, action_id: str, platform_id: str) -> dict:
        """Notify partner that their registered action was approved."""
        from app.models import ActionType
        from app.utils.serializers import to_dict

        action = db.session.get(ActionType, action_id)
        if not action:
            return {"success": False, "error": "action not found"}

        data = to_dict(action) or {}
        return OutboundWebhookService.send_event(
            db,
            platform_id,
            "action.approved",
            data,
        )

    @staticmethod
    def notify_commission_paid(db, referral_id: str, platform_id: str, amount: float) -> dict:
        """Notify partner that a commission was paid to an ambassador."""
        return OutboundWebhookService.send_event(
            db,
            platform_id,
            "commission.paid",
            {
                "referral_id": referral_id,
                "amount": amount,
                "currency": "KES",
            },
        )
