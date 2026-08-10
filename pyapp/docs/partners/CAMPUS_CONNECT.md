# Campus Connect Integration Guide

> **Credentials**
> - API Key: `b2h_fe05eadb-a78e-4ede-94cf-408ef6d8e449`
> - Platform UUID: `668fec80-a897-436f-828e-cd482a88fab3`
> - Webhook Secret: `whsec_test_campus_connect_nnn111ooo222ppp333qqq444rrr555sss666ttt777`

## Platform-Specific Actions

Register these actions for campus service commissions:

| Action | Display Name | Description |
|--------|--------------|-------------|
| `SIGNUP_STUDENT` | Student Signup | Student signs up on platform |
| `BOOK_TUTOR` | Book Tutor | Student books a campus tutor |
| `COMPLETE_COURSE` | Complete Course | Student completes a course |

## Registration Examples

```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/platform-actions/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: b2h_fe05eadb-a78e-4ede-94cf-408ef6d8e449" \
  -d '{
    "name": "SIGNUP_STUDENT",
    "display_name": "Student Signup",
    "description": "Student signs up on platform"
  }'
```

## Referral Rate Examples

Fixed rate (KES 100 per student signup):
```json
{
  "platform_id": "668fec80-a897-436f-828e-cd482a88fab3",
  "tier": "DEFAULT",
  "action": "SIGNUP_STUDENT",
  "rate": 100.0,
  "is_percentage": false
}
```

Percentage rate (10% of tutor booking):
```json
{
  "platform_id": "668fec80-a897-436f-828e-cd482a88fab3",
  "tier": "DEFAULT",
  "action": "BOOK_TUTOR",
  "rate": 10.0,
  "is_percentage": true
}
```

## Webhook Examples

Student signs up (fixed KES 100 reward):
```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/webhooks/external-conversion \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE" \
  -d '{
    "referral_code": "AMB123_REF",
    "action": "SIGNUP_STUDENT",
    "platform_id": "668fec80-a897-436f-828e-cd482a88fab3",
    "conversion_status": "CONVERTED",
    "converted_at": "2026-06-05T06:00:00Z",
    "timestamp": "2026-06-05T06:00:00Z",
    "external_user_id": "cc_user_505",
    "email": "student@example.com",
    "email_verified": true
  }'
```

Student books KES 1,800 tutor session (10% = KES 180 reward):
```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/webhooks/external-conversion \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE" \
  -d '{
    "referral_code": "AMB123_REF",
    "action": "BOOK_TUTOR",
    "platform_id": "668fec80-a897-436f-828e-cd482a88fab3",
    "conversion_status": "CONVERTED",
    "amount": 1800.00,
    "converted_at": "2026-06-05T06:00:00Z",
    "timestamp": "2026-06-05T06:00:00Z",
    "external_user_id": "cc_user_505",
    "email": "student@example.com",
    "email_verified": true
  }'
```

## Python Implementation

```python
import requests
import hmac
import hashlib
import json
from datetime import datetime, timezone

B2H_BASE = "https://api.bitshustlehubs.co.ke"
API_KEY = "b2h_fe05eadb-a78e-4ede-94cf-408ef6d8e449"
WEBHOOK_SECRET = "whsec_test_campus_connect_nnn111ooo222ppp333qqq444rrr555sss666ttt777"
PLATFORM_ID = "668fec80-a897-436f-828e-cd482a88fab3"

def sign_payload(payload, secret):
    payload_str = json.dumps(payload, separators=(',', ':'), sort_keys=True)
    return hmac.new(
        secret.encode('utf-8'),
        payload_str.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

def notify_b2h_conversion(referral_code, user_id, action, amount=None, **kwargs):
    payload = {
        "referral_code": referral_code,
        "action": action,
        "platform_id": PLATFORM_ID,
        "conversion_status": "CONVERTED",
        "converted_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        **kwargs
    }
    if amount is not None:
        payload["amount"] = amount

    sig = sign_payload(payload, WEBHOOK_SECRET)
    resp = requests.post(
        f"{B2H_BASE}/api/webhooks/external-conversion",
        headers={"X-Webhook-Signature": sig, "Content-Type": "application/json"},
        json=payload,
    )
    return resp.json()

# Student signup (fixed KES 100)
notify_b2h_conversion(
    referral_code="AMB123_REF",
    user_id="cc_user_505",
    action="SIGNUP_STUDENT",
    email="student@example.com",
    email_verified=True,
)

# Tutor booking (percentage)
notify_b2h_conversion(
    referral_code="AMB123_REF",
    user_id="cc_user_505",
    action="BOOK_TUTOR",
    amount=1800.00,
    email="student@example.com",
    email_verified=True,
)
```