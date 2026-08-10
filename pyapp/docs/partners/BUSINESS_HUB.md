# Business Hub Integration Guide

> **Credentials**
> - API Key: `b2h_2abbfebe-01bc-4434-9a73-b4378bfa08ba`
> - Platform UUID: `1e800d20-fa1e-4ff0-b5a4-9fde681226ae`
> - Webhook Secret: `whsec_test_business_hub_ooo111ppp222qqq333rrr444sss555ttt666uuu777vvv`

## Platform-Specific Actions

Register these actions for business service commissions:

| Action | Display Name | Description |
|--------|--------------|-------------|
| `SUBSCRIBE` | Subscribe | User subscribes to business service |
| `PURCHASE_PACKAGE` | Purchase Package | User purchases a business package |
| `ATTEND_WEBINAR` | Attend Webinar | User attends a business webinar |

## Registration Examples

```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/platform-actions/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: b2h_2abbfebe-01bc-4434-9a73-b4378bfa08ba" \
  -d '{
    "name": "SUBSCRIBE",
    "display_name": "Subscribe",
    "description": "User subscribes to business service"
  }'
```

## Referral Rate Examples

Percentage rate (25% of package value):
```json
{
  "platform_id": "1e800d20-fa1e-4ff0-b5a4-9fde681226ae",
  "tier": "DEFAULT",
  "action": "PURCHASE_PACKAGE",
  "rate": 25.0,
  "is_percentage": true
}
```

## Webhook Examples

User purchases KES 2,000 package (25% = KES 500 reward):
```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/webhooks/external-conversion \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE" \
  -d '{
    "referral_code": "AMB123_REF",
    "action": "PURCHASE_PACKAGE",
    "platform_id": "1e800d20-fa1e-4ff0-b5a4-9fde681226ae",
    "conversion_status": "CONVERTED",
    "amount": 2000.00,
    "converted_at": "2026-06-05T06:00:00Z",
    "timestamp": "2026-06-05T06:00:00Z",
    "external_user_id": "bh_user_404",
    "email": "entrepreneur@example.com",
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
API_KEY = "b2h_2abbfebe-01bc-4434-9a73-b4378bfa08ba"
WEBHOOK_SECRET = "whsec_test_business_hub_ooo111ppp222qqq333rrr444sss555ttt666uuu777vvv"
PLATFORM_ID = "1e800d20-fa1e-4ff0-b5a4-9fde681226ae"

def sign_payload(payload, secret):
    payload_str = json.dumps(payload, separators=(',', ':'), sort_keys=True)
    return hmac.new(
        secret.encode('utf-8'),
        payload_str.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

def notify_b2h_purchase(referral_code, user_id, amount, action="PURCHASE_PACKAGE", **kwargs):
    payload = {
        "referral_code": referral_code,
        "action": action,
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