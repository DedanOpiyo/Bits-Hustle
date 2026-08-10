# Virtual Assistance Integration Guide

> **Credentials**
> - API Key: `b2h_a2e955be-c92f-4bfc-9fb4-11363cf74586`
> - Platform UUID: `b1353dbf-d4b5-4dea-bdda-d2c8b8fe8073`
> - Webhook Secret: `whsec_test_virtual_assistance_ttt999uuu888iii777ooo666ppp555nnn444mmm333lll`

## Platform-Specific Actions

Register these actions for virtual assistance service commissions:

| Action | Display Name | Description |
|--------|--------------|-------------|
| `SERVICE_BOOKING` | Service Booking | User books a virtual assistance service |
| `TASK_COMPLETED` | Task Completed | User completes a task using the service |
| `SUBSCRIPTION_RENEWAL` | Subscription Renewal | User renews their subscription |

## Registration Examples

```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/platform-actions/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: b2h_a2e955be-c92f-4bfc-9fb4-11363cf74586" \
  -d '{
    "name": "SERVICE_BOOKING",
    "display_name": "Service Booking",
    "description": "User books a virtual assistance service"
  }'
```

## Referral Rate Examples

Percentage rate (12% of service fee):
```json
{
  "platform_id": "b1353dbf-d4b5-4dea-bdda-d2c8b8fe8073",
  "tier": "DEFAULT",
  "action": "SERVICE_BOOKING",
  "rate": 12.0,
  "is_percentage": true
}
```

## Webhook Examples

User books KES 1,200 service (12% = KES 144 reward):
```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/webhooks/external-conversion \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE" \
  -d '{
    "referral_code": "AMB123_REF",
    "action": "SERVICE_BOOKING",
    "platform_id": "b1353dbf-d4b5-4dea-bdda-d2c8b8fe8073",
    "conversion_status": "CONVERTED",
    "amount": 1200.00,
    "converted_at": "2026-06-05T06:00:00Z",
    "timestamp": "2026-06-05T06:00:00Z",
    "external_user_id": "va_user_789",
    "email": "client@example.com",
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
API_KEY = "b2h_a2e955be-c92f-4bfc-9fb4-11363cf74586"
WEBHOOK_SECRET = "whsec_test_virtual_assistance_ttt999uuu888iii777ooo666ppp555nnn444mmm333lll"
PLATFORM_ID = "b1353dbf-d4b5-4dea-bdda-d2c8b8fe8073"

def sign_payload(payload, secret):
    payload_str = json.dumps(payload, separators=(',', ':'), sort_keys=True)
    return hmac.new(
        secret.encode('utf-8'),
        payload_str.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

def notify_b2h_booking(referral_code, user_id, amount, **kwargs):
    payload = {
        "referral_code": referral_code,
        "action": "SERVICE_BOOKING",
        "platform_id": PLATFORM_ID,
        "conversion_status": "CONVERTED",
        "amount": amount,
        "converted_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "external_user_id": user_id,
        **kwargs
    }

    sig = sign_payload(payload, WEBHOOK_SECRET)
    resp = requests.post(
        f"{B2H_BASE}/api/webhooks/external-conversion",
        headers={"X-Webhook-Signature": sig, "Content-Type": "application/json"},
        json=payload,
    )
    return resp.json()
```