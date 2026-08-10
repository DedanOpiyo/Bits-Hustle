import os
import re
from typing import Optional
from flask import current_app


def _normalize_phone(phone: str) -> str:
    """Normalize phone number to international format for SMS/WhatsApp."""
    if not phone:
        return ""
    cleaned = re.sub(r"[^\d+]", "", phone)
    if cleaned.startswith("+"):
        return cleaned
    if cleaned.startswith("0") and len(cleaned) >= 10:
        return "+254" + cleaned[1:]
    if cleaned.startswith("254"):
        return "+" + cleaned
    return cleaned


class TwilioSMSService:
    """Twilio SMS service — global SMS delivery."""

    @staticmethod
    def send(to_phone: str, body: str, from_number: Optional[str] = None) -> dict:
        account_sid = current_app.config.get("TWILIO_ACCOUNT_SID", "")
        auth_token = current_app.config.get("TWILIO_AUTH_TOKEN", "")
        from_num = from_number or current_app.config.get("TWILIO_FROM_NUMBER", "")
        if not account_sid or not auth_token:
            return {"sent": False, "reason": "twilio credentials missing", "to": to_phone}
        try:
            from twilio.rest import Client
            client = Client(account_sid, auth_token)
            msg = client.messages.create(body=body, to=to_phone, from_=from_num)
            return {"sent": True, "sid": msg.sid, "to": to_phone}
        except ImportError:
            return {"sent": False, "reason": "twilio not installed", "to": to_phone}
        except Exception as exc:
            return {"sent": False, "reason": str(exc), "to": to_phone}


class MobilesasaSMSService:
    """Mobilesasa SMS service for Kenya - https://mobilesasa.com"""

    @staticmethod
    def send(to_phone: str, body: str, from_sender: Optional[str] = None) -> dict:
        api_key = current_app.config.get("MOBILESASA_API_KEY", "")
        api_secret = current_app.config.get("MOBILESASA_API_SECRET", "")
        sender = from_sender or current_app.config.get("MOBILESASA_SENDER_ID", "")
        if not api_key or not api_secret:
            return {"sent": False, "reason": "mobilesasa credentials missing", "to": to_phone}
        payload = {
            "api_key": api_key,
            "api_secret": api_secret,
            "phone": to_phone,
            "message": body,
        }
        if sender:
            payload["from"] = sender
        try:
            import requests
            resp = requests.post(
                "https://api.mobilesasa.com/v1/sms/send",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10,
            )
            ok = resp.status_code < 300
            return {"sent": ok, "status": resp.status_code, "to": to_phone}
        except Exception as exc:
            return {"sent": False, "reason": str(exc), "to": to_phone}


class MetaWhatsAppService:
    """Meta WhatsApp Cloud API service."""

    @staticmethod
    def send(to_phone: str, body: str, template_name: Optional[str] = None) -> dict:
        token = current_app.config.get("WHATSAPP_TOKEN", "")
        from_number = current_app.config.get("WHATSAPP_FROM_NUMBER", "")
        if not token or not from_number:
            return {"sent": False, "reason": "whatsapp token or from_number missing", "to": to_phone}
        payload = {
            "messaging_product": "whatsapp",
            "to": to_phone,
            "type": "text",
            "text": {"body": body},
        }
        if template_name:
            payload["type"] = "template"
            payload["template"] = {"name": template_name, "language": {"code": "en"}}
        try:
            import requests
            resp = requests.post(
                f"https://graph.facebook.com/v21.0/{from_number}/messages",
                json=payload,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                timeout=10,
            )
            ok = resp.status_code < 300
            return {"sent": ok, "status": resp.status_code, "to": to_phone}
        except Exception as exc:
            return {"sent": False, "reason": str(exc), "to": to_phone}


class NotificationChannelService:
    @staticmethod
    def dispatch(notification_record, user_phone: Optional[str] = None,
                 user_whatsapp: Optional[str] = None):
        """
        Dispatch a notification record via the relevant channel.
        
        Preference: WhatsApp > SMS (Mobilesasa for Kenya, Twilio for global)

        Parameters
        ----------
        notification_record: dict
            Serialized Notification row (must include 'title', 'message').
        user_phone: optional phone number e.g. +2547... (used for SMS)
        user_whatsapp: optional WhatsApp phone number.

        Returns list of per-channel result dicts.
        """
        if not notification_record:
            return []
        title = notification_record.get("title", "")
        body = notification_record.get("message", "")
        results = []
        
        # WhatsApp first (if enabled and phone provided)
        if user_whatsapp and current_app.config.get("WHATSAPP_ENABLED", False):
            normalized = _normalize_phone(user_whatsapp)
            r = MetaWhatsAppService.send(normalized, f"[B2H] {title}\n{body}")
            results.append(r)
        
        # SMS fallback (if enabled and phone provided)
        if user_phone and current_app.config.get("SMS_ENABLED", False):
            normalized = _normalize_phone(user_phone)
            provider = current_app.config.get("SMS_PROVIDER", "mobilesasa")
            if normalized.startswith("+254") or provider == "mobilesasa":
                r = MobilesasaSMSService.send(normalized, f"[B2H] {title}\n{body}")
            else:
                r = TwilioSMSService.send(normalized, f"[B2H] {title}\n{body}")
            results.append(r)
        
        return results
