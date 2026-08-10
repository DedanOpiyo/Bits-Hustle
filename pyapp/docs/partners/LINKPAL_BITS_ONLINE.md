# LinkPal Bits Online Integration Guide

> **Credentials**
> - API Key: `b2h_9671fc3d-c461-4528-9fdf-b61483a5652b`
> - Platform UUID: `32822149-c8a6-4561-89cc-6ca58a123530`
> - Webhook Secret: `whsec_test_linkpal_lll999ppp888ooo777nnn666mmm555kkk444jjj333iii222`

## Platform-Specific Actions

Register these actions for link sharing platform commissions:

| Action | Display Name | Description |
|--------|--------------|-------------|
| `LINK_CLICK` | Link Click | User clicks on a shared link |
| `SIGNUP_COMPLETED` | Signup Completed | User completes registration |
| `LINK_SHARED` | Link Shared | User shares a new link |

## Registration Examples

```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/platform-actions/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: b2h_9671fc3d-c461-4528-9fdf-b61483a5652b" \
  -d '{
    "name": "SIGNUP_COMPLETED",
    "display_name": "Signup Completed",
    "description": "User completes registration after clicking referral link"
  }'
```

## Referral Rate Examples

Fixed rate (KES 30 per signup):
```json
{
  "platform_id": "32822149-c8a6-4561-89cc-6ca58a123530",
  "tier": "DEFAULT",
  "action": "SIGNUP_COMPLETED",
  "rate": 30.0,
  "is_percentage": false
}
```

## Webhook Examples

User completes signup (fixed KES 30 reward):
```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/webhooks/external-conversion \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE" \
  -d '{
    "referral_code": "AMB123_REF",
    "action": "SIGNUP_COMPLETED",
    "platform_id": "32822149-c8a6-4561-89cc-6ca58a123530",
    "conversion_status": "CONVERTED",
    "converted_at": "2026-06-05T06:00:00Z",
    "timestamp": "2026-06-05T06:00:00Z",
    "external_user_id": "lp_user_202",
    "email": "linkuser@example.com",
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
API_KEY = "b2h_9671fc3d-c461-4528-9fdf-b61483a5652b"
WEBHOOK_SECRET = "whsec_test_linkpal_lll999ppp888ooo777nnn666mmm555kkk444jjj333iii222"
PLATFORM_ID = "32822149-c8a6-4561-89cc-6ca58a123530"

def sign_payload(payload, secret):
    payload_str = json.dumps(payload, separators=(',', ':'), sort_keys=True)
    return hmac.new(
        secret.encode('utf-8'),
        payload_str.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

def notify_b2h_signup(referral_code, user_id, **kwargs):
    payload = {
        "referral_code": referral_code,
        "action": "SIGNUP_COMPLETED",
        "platform_id": PLATFORM_ID,
        "conversion_status": "CONVERTED",
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