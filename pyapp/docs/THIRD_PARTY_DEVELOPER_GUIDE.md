# Third-Party Developer Integration Guide

## Connecting Your Platform to BitsHustleHubs API

This guide explains how external platforms can integrate with BitsHustleHubs to enable ambassador referrals, track conversions, and earn commissions.

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Authentication](#authentication)
4. [API Endpoints](#api-endpoints)
5. [Integration Flow](#integration-flow)
6. [Webhooks](#webhooks)
7. [Code Examples](#code-examples)
8. [Error Handling](#error-handling)
9. [Testing](#testing)
10. [Support](#support)

---

## Overview

BitsHustleHubs provides a RESTful API that allows third-party platforms to:

- **Register actions** that ambassadors can perform on your platform
- **Set commission rates** for each action (fixed KES or percentage)
- **Track conversions** when referred users complete actions
- **Receive notifications** when commissions are paid
- **Manage referral tracking** automatically

### Base URLs

| Environment | Base URL |
|-------------|----------|
| Production | `https://api.bitshustlehubs.co.ke/api` |
| Sandbox | `https://sandbox.bitshustlehubs.co.ke/api` |
| Local Development | `http://localhost:5000/api` |

---

## Getting Started

### Step 1: Request API Credentials

Contact BitsHustleHubs admin to receive:

- **API Key** (`X-API-Key`) — Used to authenticate your API requests
- **Webhook Secret** (`whsec_...`) — Used to sign and verify webhooks
- **Platform ID** (UUID) — Your unique platform identifier

### Step 2: Configure Your Environment

Store your credentials securely:

```bash
# Environment variables
export B2H_API_KEY="b2h_your_api_key_here"
export B2H_WEBHOOK_SECRET="whsec_your_secret_here"
export B2H_PLATFORM_ID="your-platform-uuid"
export B2H_BASE_URL="https://api.bitshustlehubs.co.ke"
```

**⚠️ Security Notice:**
- Never commit API keys or webhook secrets to version control
- Use environment variables or a secrets manager
- Rotate credentials immediately if compromised

---

## Authentication

All API requests require the `X-API-Key` header:

```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/platform-actions/register \
  -H "X-API-Key: b2h_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"name": "PURCHASE", "display_name": "Make Purchase"}'
```

### API Key Scopes

Your API key has specific permissions (scopes):

| Scope | Description |
|-------|-------------|
| `actions:create` | Register new actions |
| `rates:create` | Create commission rates |
| `rates:update` | Update commission rates |
| `rates:read` | View commission rates |

If you receive a `403 Forbidden` error, your API key lacks the required scope.

---

## API Endpoints

### 1. Register Actions

Register actions that ambassadors can perform on your platform.

**Endpoint:** `POST /api/platform-actions/register`

**Request:**
```json
{
  "name": "PURCHASE",
  "display_name": "Make Purchase",
  "description": "User completes a purchase"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "action registered — pending admin approval",
  "data": {
    "id": "action-uuid",
    "name": "PURCHASE",
    "display_name": "Make Purchase",
    "platform_id": "your-platform-id",
    "is_approved": false
  }
}
```

**Notes:**
- Actions require admin approval before use
- You'll receive a webhook notification when approved
- Action names should be uppercase with underscores (e.g., `SUBSCRIPTION_SIGNUP`)

---

### 2. Set Commission Rates

Set commission rates for each action after approval.

**Endpoint:** `POST /api/referral-rates`

**Request (Fixed Rate):**
```json
{
  "platform_id": "your-platform-id",
  "tier": "DEFAULT",
  "action": "PURCHASE",
  "rate": 100.0,
  "is_percentage": false
}
```

**Request (Percentage Rate):**
```json
{
  "platform_id": "your-platform-id",
  "tier": "DEFAULT",
  "action": "PURCHASE",
  "rate": 5.0,
  "is_percentage": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "rate saved",
  "data": {
    "id": "rate-uuid",
    "platform_id": "your-platform-id",
    "action": "PURCHASE",
    "rate": 100.0,
    "is_percentage": false
  }
}
```

**Notes:**
- `tier`: Ambassador tier level (use `"DEFAULT"` for all tiers)
- Fixed rate: Ambassador earns fixed KES amount
- Percentage rate: Ambassador earns percentage of transaction amount

---

### 3. View Commission Rates

View current commission rates for your platform.

**Endpoint:** `GET /api/referral-rates?platform_id=your-platform-id`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "success",
  "data": [
    {
      "id": "rate-uuid",
      "platform_id": "your-platform-id",
      "action": "PURCHASE",
      "rate": 100.0,
      "is_percentage": false,
      "tier": "DEFAULT"
    }
  ]
}
```

---

### 4. Track Conversions (Webhook)

Notify BitsHustleHubs when a referred user completes an action.

**Endpoint:** `POST /api/webhooks/external-conversion`

**Headers:**
```
Content-Type: application/json
X-Webhook-Signature: <hmac-sha256-signature>
```

**Request:**
```json
{
  "referral_code": "AMB123",
  "platform_id": "your-platform-id",
  "action": "PURCHASE",
  "conversion_status": "CONVERTED",
  "amount": 2500.00,
  "external_user_id": "user_123",
  "email": "user@example.com",
  "email_verified": true,
  "timestamp": "2026-08-03T14:30:00Z"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "conversion processed",
  "data": {
    "referral_id": "referral-uuid",
    "conversion_status": "CONVERTED",
    "commission_paid": 100.0
  }
}
```

**Required Fields:**
- `referral_code` — From the referral URL
- `platform_id` — Your platform UUID
- `action` — Registered action name
- `conversion_status` — `"PENDING"` or `"CONVERTED"`
- `external_user_id` — Unique user identifier on your platform
- `email` or `phone` — User contact info
- `email_verified` or `phone_verified` — Boolean
- `timestamp` — ISO 8601 UTC timestamp
- `amount` — Required for `"CONVERTED"` status

---

### 5. Set Your Webhook URL (Self-Service)

Configure where BitsHustleHubs sends notifications.

**Endpoint:** `PUT /api/platforms/me/webhook-url`

**Request:**
```json
{
  "webhook_url": "https://yourplatform.com/webhooks/b2h"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "webhook URL updated",
  "data": {
    "webhook_url": "https://yourplatform.com/webhooks/b2h"
  }
}
```

---

### 6. Get Your Platform Info

Retrieve your platform details.

**Endpoint:** `GET /api/platforms/me`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "success",
  "data": {
    "id": "your-platform-id",
    "name": "YOUR_PLATFORM",
    "display_name": "Your Platform",
    "webhook_url": "https://yourplatform.com/webhooks/b2h"
  }
}
```

---

## Integration Flow

### Step-by-Step Process

```
1. User clicks referral link
   ↓
2. Extract referral_code from URL
   ↓
3. User signs up / logs in on your platform
   ↓
4. User completes action (e.g., makes purchase)
   ↓
5. Your platform sends conversion webhook to B2H
   ↓
6. B2H verifies signature and processes conversion
   ↓
7. B2H credits ambassador wallet
   ↓
8. B2H sends outbound webhook to your platform (optional)
```

### Referral URL Format

When a user clicks a referral link, the URL contains the referral code:

```
https://yourplatform.com/signup?ref=AMB123
```

Extract the `ref` parameter and store it with the user's account.

---

## Webhooks

### Sending Webhooks to BitsHustleHubs

All webhooks sent to B2H must be signed with HMAC-SHA256.

#### Signature Generation

**Python:**
```python
import hmac
import hashlib
import json

def sign_payload(payload: dict, secret: str) -> str:
    payload_str = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    return hmac.new(
        secret.encode("utf-8"),
        payload_str.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
```

**Node.js:**
```javascript
const crypto = require('crypto');

function signPayload(payload, secret) {
  const payloadStr = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto
    .createHmac('sha256', secret)
    .update(payloadStr)
    .digest('hex');
}
```

#### Complete Example

```python
import requests
from datetime import datetime, timezone

payload = {
    "referral_code": "AMB123",
    "platform_id": "your-platform-id",
    "action": "PURCHASE",
    "conversion_status": "CONVERTED",
    "amount": 2500.00,
    "external_user_id": "user_123",
    "email": "user@example.com",
    "email_verified": True,
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
}

signature = sign_payload(payload, os.environ["B2H_WEBHOOK_SECRET"])

response = requests.post(
    f"{os.environ['B2H_BASE_URL']}/api/webhooks/external-conversion",
    json=payload,
    headers={
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature
    }
)

print(response.json())
```

---

### Receiving Webhooks from BitsHustleHubs

B2H sends webhooks to your platform for events like:

- `action.approved` — Your registered action was approved
- `commission.paid` — A commission was paid to an ambassador

#### Webhook Payload Structure

```json
{
  "event_type": "commission.paid",
  "platform_id": "your-platform-id",
  "timestamp": "2026-08-03T14:30:00Z",
  "data": {
    "referral_id": "referral-uuid",
    "amount": 100.0,
    "currency": "KES"
  }
}
```

#### Verifying Incoming Webhooks

**Python (Flask):**
```python
from flask import Flask, request, jsonify
import hmac
import hashlib
import json

app = Flask(__name__)

def verify_signature(payload: dict, signature: str, secret: str) -> bool:
    payload_str = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    expected = hmac.new(
        secret.encode("utf-8"),
        payload_str.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)

@app.route("/webhooks/b2h", methods=["POST"])
def handle_b2h_webhook():
    signature = request.headers.get("X-B2H-Signature")
    payload = request.get_json()
    
    if not verify_signature(payload, signature, os.environ["B2H_WEBHOOK_SECRET"]):
        return jsonify({"error": "invalid signature"}), 401
    
    event_type = payload.get("event_type")
    
    if event_type == "commission.paid":
        # Handle commission paid event
        referral_id = payload["data"]["referral_id"]
        amount = payload["data"]["amount"]
        print(f"Commission paid: {amount} KES for referral {referral_id}")
    
    elif event_type == "action.approved":
        # Handle action approved event
        action_id = payload["data"]["id"]
        print(f"Action approved: {action_id}")
    
    return jsonify({"success": True}), 200
```

**Node.js (Express):**
```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

function verifySignature(payload, signature, secret) {
  const payloadStr = JSON.stringify(payload, Object.keys(payload).sort());
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payloadStr)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

app.post('/webhooks/b2h', (req, res) => {
  const signature = req.headers['x-b2h-signature'];
  const payload = req.body;
  
  if (!verifySignature(payload, signature, process.env.B2H_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'invalid signature' });
  }
  
  const eventType = payload.event_type;
  
  if (eventType === 'commission.paid') {
    const { referral_id, amount } = payload.data;
    console.log(`Commission paid: ${amount} KES for referral ${referral_id}`);
  }
  
  res.json({ success: true });
});

app.listen(3000);
```

---

## Code Examples

### Complete Integration Example (Python)

```python
import os
import requests
import hmac
import hashlib
import json
from datetime import datetime, timezone

# Configuration
B2H_BASE_URL = os.environ["B2H_BASE_URL"]
B2H_API_KEY = os.environ["B2H_API_KEY"]
B2H_WEBHOOK_SECRET = os.environ["B2H_WEBHOOK_SECRET"]
B2H_PLATFORM_ID = os.environ["B2H_PLATFORM_ID"]

def api_request(method, path, payload=None):
    """Make authenticated API request to B2H."""
    url = f"{B2H_BASE_URL}/api{path}"
    headers = {
        "X-API-Key": B2H_API_KEY,
        "Content-Type": "application/json"
    }
    
    if method == "GET":
        response = requests.get(url, headers=headers, params=payload)
    else:
        response = requests.request(method, url, headers=headers, json=payload)
    
    response.raise_for_status()
    return response.json()

def sign_payload(payload):
    """Sign webhook payload with HMAC-SHA256."""
    payload_str = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    return hmac.new(
        B2H_WEBHOOK_SECRET.encode("utf-8"),
        payload_str.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

# Step 1: Register actions
actions = [
    {"name": "SIGNUP", "display_name": "User Signup", "description": "New user registration"},
    {"name": "PURCHASE", "display_name": "Make Purchase", "description": "User completes purchase"}
]

for action in actions:
    result = api_request("POST", "/platform-actions/register", action)
    print(f"Registered action: {action['name']}")

# Step 2: Set commission rates (after admin approval)
rates = [
    {
        "platform_id": B2H_PLATFORM_ID,
        "tier": "DEFAULT",
        "action": "SIGNUP",
        "rate": 50.0,
        "is_percentage": False
    },
    {
        "platform_id": B2H_PLATFORM_ID,
        "tier": "DEFAULT",
        "action": "PURCHASE",
        "rate": 5.0,
        "is_percentage": True
    }
]

for rate in rates:
    result = api_request("POST", "/referral-rates", rate)
    print(f"Set rate for {rate['action']}: {rate['rate']}")

# Step 3: Track conversion when user completes action
def track_conversion(referral_code, action, amount=None, user_id=None, email=None):
    """Send conversion webhook to B2H."""
    payload = {
        "referral_code": referral_code,
        "platform_id": B2H_PLATFORM_ID,
        "action": action,
        "conversion_status": "CONVERTED",
        "external_user_id": user_id,
        "email": email,
        "email_verified": True,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    
    if amount:
        payload["amount"] = amount
    
    signature = sign_payload(payload)
    
    response = requests.post(
        f"{B2H_BASE_URL}/api/webhooks/external-conversion",
        json=payload,
        headers={
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature
        }
    )
    
    return response.json()

# Example: User makes a KES 2,500 purchase
result = track_conversion(
    referral_code="AMB123",
    action="PURCHASE",
    amount=2500.00,
    user_id="user_123",
    email="user@example.com"
)

print(f"Conversion tracked: {result}")
```

---

### Complete Integration Example (Node.js)

```javascript
const crypto = require('crypto');
const fetch = require('node-fetch');

// Configuration
const B2H_BASE_URL = process.env.B2H_BASE_URL;
const B2H_API_KEY = process.env.B2H_API_KEY;
const B2H_WEBHOOK_SECRET = process.env.B2H_WEBHOOK_SECRET;
const B2H_PLATFORM_ID = process.env.B2H_PLATFORM_ID;

async function apiRequest(method, path, payload = null) {
  const url = `${B2H_BASE_URL}/api${path}`;
  const headers = {
    'X-API-Key': B2H_API_KEY,
    'Content-Type': 'application/json'
  };
  
  const options = { method, headers };
  if (payload && method !== 'GET') {
    options.body = JSON.stringify(payload);
  }
  
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return response.json();
}

function signPayload(payload) {
  const payloadStr = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto
    .createHmac('sha256', B2H_WEBHOOK_SECRET)
    .update(payloadStr)
    .digest('hex');
}

// Step 1: Register actions
async function registerActions() {
  const actions = [
    { name: 'SIGNUP', display_name: 'User Signup', description: 'New user registration' },
    { name: 'PURCHASE', display_name: 'Make Purchase', description: 'User completes purchase' }
  ];
  
  for (const action of actions) {
    const result = await apiRequest('POST', '/platform-actions/register', action);
    console.log(`Registered action: ${action.name}`);
  }
}

// Step 2: Set commission rates
async function setRates() {
  const rates = [
    {
      platform_id: B2H_PLATFORM_ID,
      tier: 'DEFAULT',
      action: 'SIGNUP',
      rate: 50.0,
      is_percentage: false
    },
    {
      platform_id: B2H_PLATFORM_ID,
      tier: 'DEFAULT',
      action: 'PURCHASE',
      rate: 5.0,
      is_percentage: true
    }
  ];
  
  for (const rate of rates) {
    const result = await apiRequest('POST', '/referral-rates', rate);
    console.log(`Set rate for ${rate.action}: ${rate.rate}`);
  }
}

// Step 3: Track conversion
async function trackConversion(referralCode, action, amount = null, userId = null, email = null) {
  const payload = {
    referral_code: referralCode,
    platform_id: B2H_PLATFORM_ID,
    action,
    conversion_status: 'CONVERTED',
    external_user_id: userId,
    email,
    email_verified: true,
    timestamp: new Date().toISOString()
  };
  
  if (amount) {
    payload.amount = amount;
  }
  
  const signature = signPayload(payload);
  
  const response = await fetch(`${B2H_BASE_URL}/api/webhooks/external-conversion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature
    },
    body: JSON.stringify(payload)
  });
  
  return response.json();
}

// Example usage
(async () => {
  await registerActions();
  await setRates();
  
  const result = await trackConversion(
    'AMB123',
    'PURCHASE',
    2500.00,
    'user_123',
    'user@example.com'
  );
  
  console.log('Conversion tracked:', result);
})();
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Request processed successfully |
| 201 | Created | Resource created (e.g., action registered) |
| 400 | Bad Request | Invalid payload or missing fields |
| 401 | Unauthorized | Missing or invalid API key / signature |
| 403 | Forbidden | Insufficient API key scope |
| 404 | Not Found | Resource not found (e.g., referral code) |
| 409 | Conflict | Duplicate request (idempotent — safe to retry) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Contact support |

### Error Response Format

```json
{
  "success": false,
  "message": "error description",
  "details": {}
}
```

### Common Errors

**401 Unauthorized — Invalid API Key**
```json
{
  "success": false,
  "message": "invalid or revoked API key"
}
```
**Solution:** Verify your API key is correct and active.

**403 Forbidden — Insufficient Scope**
```json
{
  "success": false,
  "message": "insufficient scope: requires one of rates:create"
}
```
**Solution:** Request additional scopes from B2H admin.

**401 Unauthorized — Invalid Webhook Signature**
```json
{
  "success": false,
  "message": "invalid signature"
}
```
**Solution:** Verify your webhook secret and signature generation logic.

**404 Not Found — Referral Code Not Found**
```json
{
  "success": false,
  "message": "referral code not found"
}
```
**Solution:** Verify the referral code exists and is active.

**429 Too Many Requests — Rate Limit Exceeded**
```json
{
  "success": false,
  "message": "Rate limit exceeded. Please try again later.",
  "retry_after": 60
}
```
**Solution:** Implement exponential backoff and retry after the specified duration.

---

## Testing

### Test Environment

Use the sandbox environment for testing:

```bash
export B2H_BASE_URL="https://sandbox.bitshustlehubs.co.ke"
```

### Test Webhook Signature

Verify your signature generation is correct:

```python
import hmac
import hashlib
import json

payload = {
    "referral_code": "TEST",
    "platform_id": "test-platform-id",
    "action": "TEST_ACTION",
    "conversion_status": "CONVERTED",
    "timestamp": "2026-08-03T14:30:00Z"
}

secret = "whsec_test_secret"
payload_str = json.dumps(payload, separators=(",", ":"), sort_keys=True)
signature = hmac.new(
    secret.encode("utf-8"),
    payload_str.encode("utf-8"),
    hashlib.sha256
).hexdigest()

print(f"Signature: {signature}")
```

### Test Conversion Webhook

```bash
curl -X POST https://sandbox.bitshustlehubs.co.ke/api/webhooks/external-conversion \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: <your-signature>" \
  -d '{
    "referral_code": "TEST_CODE",
    "platform_id": "your-platform-id",
    "action": "PURCHASE",
    "conversion_status": "CONVERTED",
    "amount": 100.00,
    "external_user_id": "test_user",
    "email": "test@example.com",
    "email_verified": true,
    "timestamp": "2026-08-03T14:30:00Z"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "conversion processed",
  "data": {...}
}
```

---

## Support

### Contact

- **Email:** support@bitshustlehubs.co.ke
- **Documentation:** https://docs.bitshustlehubs.co.ke

### Provide When Requesting Support

- Your platform name
- Error message received
- Request/response payloads (redact sensitive data)
- Timestamp of the request

### Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/api/platform-actions/register` | 60 requests/minute |
| `/api/referral-rates` (POST) | 60 requests/minute |
| `/api/webhooks/external-conversion` | 100 requests/minute |

If you need higher limits, contact support.

---

## Changelog

### 2026-08-03

- Added outbound webhook support (B2H → partner platforms)
- Added self-service webhook URL configuration
- Added API key scope enforcement
- Improved webhook signature verification

### 2026-05-27

- Initial API release
- Action registration
- Commission rate management
- Conversion tracking webhooks

---

## License

© 2026 BitsHustleHubs. All rights reserved.
