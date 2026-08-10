# BitTutorConnect Integration Guide

> **Credentials**
> - API Key: `b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab`
> - Platform UUID: `b552099e-987c-4109-bdc8-8b7600600752`
> - Webhook Secret: `whsec_test_tutorconnect_xyz789abc012def345ghi678jkl901mno234pqr567stu890vwx1`

## Platform-Specific Actions

Register these actions for tutoring session commissions:

| Action | Display Name | Description |
|--------|--------------|-------------|
| `START_TUTORING_SESSION` | Start Tutoring Session | User completes their first tutoring session |
| `BOOK_SESSION` | Book a Session | User books a paid tutoring session |

## Registration Examples

```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/platform-actions/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab" \
  -d '{
    "name": "BOOK_SESSION",
    "display_name": "Book a Session",
    "description": "User books a paid tutoring session"
  }'
```

## Referral Rate Examples

Fixed rate (KES 200 per completed session):
```json
{
  "platform_id": "b552099e-987c-4109-bdc8-8b7600600752",
  "tier": "DEFAULT",
  "action": "START_TUTORING_SESSION",
  "rate": 200.0,
  "is_percentage": false
}
```

Percentage rate (8% of session fee):
```json
{
  "platform_id": "b552099e-987c-4109-bdc8-8b7600600752",
  "tier": "DEFAULT",
  "action": "BOOK_SESSION",
  "rate": 8.0,
  "is_percentage": true
}
```

## Webhook Examples

User books KES 2,500 session (triggers 8% = KES 200 reward):
```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/webhooks/external-conversion \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE" \
  -d '{
    "referral_code": "AMB123_REF",
    "action": "BOOK_SESSION",
    "platform_id": "b552099e-987c-4109-bdc8-8b7600600752",
    "conversion_status": "CONVERTED",
    "amount": 2500.00,
    "converted_at": "2026-06-05T06:00:00Z",
    "timestamp": "2026-06-05T06:00:00Z",
    "external_user_id": "tc_user_456",
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
API_KEY = "b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab"
WEBHOOK_SECRET = "whsec_test_tutorconnect_xyz789abc012def345ghi678jkl901mno234pqr567stu890vwx1"
PLATFORM_ID = "b552099e-987c-4109-bdc8-8b7600600752"

def sign_payload(payload, secret):
    payload_str = json.dumps(payload, separators=(',', ':'), sort_keys=True)
    return hmac.new(
        secret.encode('utf-8'),
        payload_str.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

def notify_b2h_conversion(referral_code, action, amount=None, **kwargs):
    payload = {
        "referral_code": referral_code,
        "action": action,
        "platform_id": PLATFORM_ID,
        "conversion_status": "CONVERTED",
        "converted_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    if amount is not None:
        payload["amount"] = amount
    payload.update(kwargs)

    sig = sign_payload(payload, WEBHOOK_SECRET)
    resp = requests.post(
        f"{B2H_BASE}/api/webhooks/external-conversion",
        headers={"X-Webhook-Signature": sig, "Content-Type": "application/json"},
        json=payload,
    )
    return resp.json()

# User books a KES 2,500 tutoring session
notify_b2h_conversion(
    referral_code="AMB123_REF",
    action="BOOK_SESSION",
    amount=2500.00,
    external_user_id="tc_user_456",
    email="student@example.com",
    email_verified=True,
)
```

---

## Lost Webhook Secret Recovery

If you lose your webhook secret, **contact your B2H admin immediately**. The admin will:
1. Navigate to the B2H admin dashboard
2. Go to **Platform Integrations** → Select BitTutorConnect
3. Click **Regenerate Webhook Secret**
4. Copy the new secret (shown once) and share it securely with your team

> ⚠️ The old secret becomes invalid immediately after regeneration. Update all webhook signing code to use the new secret. Previous webhooks using the old secret will fail authentication.