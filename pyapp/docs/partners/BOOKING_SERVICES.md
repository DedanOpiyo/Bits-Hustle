# Booking Services Integration Guide

> **Credentials**
> - API Key: `b2h_f5673535-bea7-4162-8a6a-4d647f97e8b9`
> - Platform UUID: `39fcaee2-6319-4718-9bdc-f31edd5365d5`
> - Webhook Secret: `whsec_test_booking_bbb111ccc222ddd333eee444fff555ggg666hhh777iii`

## Platform-Specific Actions

Register these actions for booking platform commissions:

| Action | Display Name | Description |
|--------|--------------|-------------|
| `MAKE_BOOKING` | Make Booking | User creates a booking |
| `BOOKING_CONFIRMED` | Booking Confirmed | Booking is confirmed |
| `ROOM_RESERVATION` | Room Reservation | User reserves accommodation |

## Registration Examples

```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/platform-actions/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: b2h_f5673535-bea7-4162-8a6a-4d647f97e8b9" \
  -d '{
    "name": "MAKE_BOOKING",
    "display_name": "Make Booking",
    "description": "User creates a booking"
  }'
```

## Referral Rate Examples

Percentage rate (20% of booking value):
```json
{
  "platform_id": "39fcaee2-6319-4718-9bdc-f31edd5365d5",
  "tier": "DEFAULT",
  "action": "MAKE_BOOKING",
  "rate": 20.0,
  "is_percentage": true
}
```

## Webhook Examples

User makes KES 4,500 booking (20% = KES 900 reward):
```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/webhooks/external-conversion \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE" \
  -d '{
    "referral_code": "AMB123_REF",
    "action": "MAKE_BOOKING",
    "platform_id": "39fcaee2-6319-4718-9bdc-f31edd5365d5",
    "conversion_status": "CONVERTED",
    "amount": 4500.00,
    "converted_at": "2026-06-05T06:00:00Z",
    "timestamp": "2026-06-05T06:00:00Z",
    "external_user_id": "bs_user_303",
    "email": "traveler@example.com",
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
API_KEY = "b2h_f5673535-bea7-4162-8a6a-4d647f97e8b9"
WEBHOOK_SECRET = "whsec_test_booking_bbb111ccc222ddd333eee444fff555ggg666hhh777iii"
PLATFORM_ID = "39fcaee2-6319-4718-9bdc-f31edd5365d5"

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
        "action": "MAKE_BOOKING",
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