# PhotoMart Integration Guide

> **Credentials**
> - API Key: `b2h_a7d5d626-7246-4f4a-afbf-9a37d6b2113d`
> - Platform UUID: `1e0575d7-80d8-4de8-82fb-a8552df10fe0`
> - Webhook Secret: `whsec_test_photmart_aaa11222bbb333ccc444ddd555eee666fff777ggg888`

## Platform-Specific Actions

Register these actions for photo purchase commissions:

| Action | Display Name | Description |
|--------|--------------|-------------|
| `PURCHASE_PHOTO` | Purchase Photo | User purchases a photo download |
| `BUY_CREDITS` | Buy Credits | User buys photo credits |
| `PREMIUM_UPGRADE` | Premium Upgrade | User upgrades to premium account |

## Registration Examples

```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/platform-actions/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: b2h_a7d5d626-7246-4f4a-afbf-9a37d6b2113d" \
  -d '{
    "name": "PURCHASE_PHOTO",
    "display_name": "Purchase Photo",
    "description": "User purchases a photo download"
  }'
```

## Referral Rate Examples

Percentage rate (10% of photo sale):
```json
{
  "platform_id": "1e0575d7-80d8-4de8-82fb-a8552df10fe0",
  "tier": "DEFAULT",
  "action": "PURCHASE_PHOTO",
  "rate": 10.0,
  "is_percentage": true
}
```

Fixed rate (KES 150 per premium upgrade):
```json
{
  "platform_id": "1e0575d7-80d8-4de8-82fb-a8552df10fe0",
  "tier": "DEFAULT",
  "action": "PREMIUM_UPGRADE",
  "rate": 150.0,
  "is_percentage": false
}
```

## Webhook Examples

User purchases KES 800 photo (10% = KES 80 reward):
```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/webhooks/external-conversion \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE" \
  -d '{
    "referral_code": "AMB123_REF",
    "action": "PURCHASE_PHOTO",
    "platform_id": "1e0575d7-80d8-4de8-82fb-a8552df10fe0",
    "conversion_status": "CONVERTED",
    "amount": 800.00,
    "converted_at": "2026-06-05T06:00:00Z",
    "timestamp": "2026-06-05T06:00:00Z",
    "external_user_id": "pm_user_456",
    "email": "photographer@example.com",
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
API_KEY = "b2h_a7d5d626-7246-4f4a-afbf-9a37d6b2113d"
WEBHOOK_SECRET = "whsec_test_photmart_aaa11222bbb333ccc444ddd555eee666fff777ggg888"
PLATFORM_ID = "1e0575d7-80d8-4de8-82fb-a8552df10fe0"

def sign_payload(payload, secret):
    payload_str = json.dumps(payload, separators=(',', ':'), sort_keys=True)
    return hmac.new(
        secret.encode('utf-8'),
        payload_str.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

def notify_b2h_purchase(referral_code, user_id, amount, action="PURCHASE_PHOTO", **kwargs):
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