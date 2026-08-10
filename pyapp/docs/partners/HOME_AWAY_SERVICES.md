# Home & Away Services Integration Guide

> **Credentials**
> - API Key: `b2h_f4adc2f8-1a6d-4bdb-9c61-de865bd6c60e`
> - Platform UUID: `bb115a3a-b212-46c7-99b7-dda6551ef844`
> - Webhook Secret: `whsec_test_home_away_hhh111aaa222bbb333ccc444ddd555eee666fff777`

## Platform-Specific Actions

Register these actions for home service booking commissions:

| Action | Display Name | Description |
|--------|--------------|-------------|
| `BOOK_SERVICE` | Book Service | User books a home service |
| `SERVICE_COMPLETED` | Service Completed | Service is marked as completed |
| `REVIEW_SUBMITTED` | Review Submitted | User submits a service review |

## Registration Examples

```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/platform-actions/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: b2h_f4adc2f8-1a6d-4bdb-9c61-de865bd6c60e" \
  -d '{
    "name": "BOOK_SERVICE",
    "display_name": "Book Service",
    "description": "User books a home service"
  }'
```

## Referral Rate Examples

Percentage rate (15% of service cost):
```json
{
  "platform_id": "bb115a3a-b212-46c7-99b7-dda6551ef844",
  "tier": "DEFAULT",
  "action": "BOOK_SERVICE",
  "rate": 15.0,
  "is_percentage": true
}
```

## Webhook Examples

User books KES 3,500 service (15% = KES 525 reward):
```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/webhooks/external-conversion \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE" \
  -d '{
    "referral_code": "AMB123_REF",
    "action": "BOOK_SERVICE",
    "platform_id": "bb115a3a-b212-46c7-99b7-dda6551ef844",
    "conversion_status": "CONVERTED",
    "amount": 3500.00,
    "converted_at": "2026-06-05T06:00:00Z",
    "timestamp": "2026-06-05T06:00:00Z",
    "external_user_id": "ha_user_101",
    "email": "homeowner@example.com",
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
API_KEY = "b2h_f4adc2f8-1a6d-4bdb-9c61-de865bd6c60e"
WEBHOOK_SECRET = "whsec_test_home_away_hhh111aaa222bbb333ccc444ddd555eee666fff777"
PLATFORM_ID = "bb115a3a-b212-46c7-99b7-dda6551ef844"

def sign_payload(payload, secret):
    payload_str = json.dumps(payload, separators=(',', ':'), sort_keys=True)
    return hmac.new(
        secret.encode('utf-8'),
        payload_str.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

def notify_b2h_service(referral_code, user_id, amount, **kwargs):
    payload = {
        "referral_code": referral_code,
        "action": "BOOK_SERVICE",
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