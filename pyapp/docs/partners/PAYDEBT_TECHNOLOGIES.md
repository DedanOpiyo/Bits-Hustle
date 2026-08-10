# PayDebt Technologies Integration Guide

> **Credentials**
> - API Key: `b2h_ca4baf52-b2f9-4dbb-b8f3-6dd445ef1e19`
> - Platform UUID: `ad06c2af-a7a0-4026-bbe6-c26fae29941c`
> - Webhook Secret: `whsec_test_paydebt_qwe123rty456asd789fgh012jkl345zxc678vbn901mnb234vcx567`

## Platform-Specific Actions

Register these actions for debt payment commissions:

| Action | Display Name | Description |
|--------|--------------|-------------|
| `SUBMIT_PAYMENT` | Submit Payment | User submits a debt payment |
| `LOAN_APPROVAL` | Loan Approval | User gets approved for a loan |
| `DEBT_CLEARED` | Debt Cleared | User fully clears their debt |

## Registration Examples

```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/platform-actions/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: b2h_ca4baf52-b2f9-4dbb-b8f3-6dd445ef1e19" \
  -d '{
    "name": "SUBMIT_PAYMENT",
    "display_name": "Submit Payment",
    "description": "User submits a debt payment"
  }'
```

## Referral Rate Examples

Fixed rate (KES 100 per payment):
```json
{
  "platform_id": "ad06c2af-a7a0-4026-bbe6-c26fae29941c",
  "tier": "DEFAULT",
  "action": "SUBMIT_PAYMENT",
  "rate": 100.0,
  "is_percentage": false
}
```

Percentage rate (3% of loan amount):
```json
{
  "platform_id": "ad06c2af-a7a0-4026-bbe6-c26fae29941c",
  "tier": "DEFAULT",
  "action": "LOAN_APPROVAL",
  "rate": 3.0,
  "is_percentage": true
}
```

## Webhook Examples

User submits KES 5,000 payment (percentage reward):
```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/webhooks/external-conversion \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE" \
  -d '{
    "referral_code": "AMB123_REF",
    "action": "SUBMIT_PAYMENT",
    "platform_id": "ad06c2af-a7a0-4026-bbe6-c26fae29941c",
    "conversion_status": "CONVERTED",
    "amount": 5000.00,
    "converted_at": "2026-06-05T06:00:00Z",
    "timestamp": "2026-06-05T06:00:00Z",
    "external_user_id": "pd_user_123",
    "email": "borrower@example.com",
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
API_KEY = "b2h_ca4baf52-b2f9-4dbb-b8f3-6dd445ef1e19"
WEBHOOK_SECRET = "whsec_test_paydebt_qwe123rty456asd789fgh012jkl345zxc678vbn901mnb234vcx567"
PLATFORM_ID = "ad06c2af-a7a0-4026-bbe6-c26fae29941c"

def sign_payload(payload, secret):
    payload_str = json.dumps(payload, separators=(',', ':'), sort_keys=True)
    return hmac.new(
        secret.encode('utf-8'),
        payload_str.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

def notify_b2h_payment(referral_code, user_id, amount, **kwargs):
    payload = {
        "referral_code": referral_code,
        "action": "SUBMIT_PAYMENT",
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