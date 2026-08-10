# BitshustleHubs External Platform Integration Guide

> **⚠️ THIS IS AN EXTERNAL INTEGRATION GUIDE — NOT A B2H IMPLEMENTATION SPEC**
>
> This document is intended for **third-party partner platforms** (e.g. Dad's BookShelves, TutorConnect, PayDebt Technologies) that want to integrate their systems **with** Bits Hustle Hubs (B2H) to enable automated referral tracking.
>
> This is NOT a specification for building B2H itself. B2H already exists as the receiving system. Partner platforms call B2H APIs and send webhooks **to** B2H. If you are a B2H developer working on this codebase, do NOT implement the API endpoints, webhook receivers, or platform management features described here — they already exist in the B2H backend.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites & Credentials](#2-prerequisites--credentials)
3. [Base URLs](#3-base-urls)
4. [Authentication](#4-authentication)
5. [Step 1: Discover Available Platforms](#5-step-1-discover-available-platforms)
6. [Step 2: Register Your Platform Actions](#6-step-2-register-your-platform-actions)
7. [Step 3: Configure Referral Rates](#7-step-3-configure-referral-rates)
8. [Step 4: Set Your Webhook URL (Optional)](#8-step-4-set-your-webhook-url-optional)
9. [Step 5: Track Conversions via Webhook](#9-step-5-track-conversions-via-webhook)
10. [Step 6: Receive B2H Outbound Events (Optional)](#10-step-6-receive-b2h-outbound-events-optional)
11. [Additional Endpoints](#11-additional-endpoints)
12. [Rate Limits](#12-rate-limits)
13. [Response Envelope Format](#13-response-envelope-format)
14. [Error Handling & Response Codes](#14-error-handling--response-codes)
15. [Complete Integration Examples](#15-complete-integration-examples)
16. [Testing](#16-testing)
17. [Security Best Practices](#17-security-best-practices)
18. [Credential Recovery](#18-credential-recovery)
19. [Support](#19-support)

---

## 1. Overview

Bits Hustle Hub (B2H) enables **cross-platform referral tracking** between your partner platform and B2H's ambassador ecosystem. When a user signs up or takes a paid action on your platform using a B2H referral code, B2H automatically credits the referring ambassador's wallet with a commission.

### Integration Flow Summary

| Step | What You Do | B2H Endpoint |
|------|-------------|-------------|
| 1 | Discover B2H platforms | `GET /api/platforms` |
| 2 | Register commission-triggering actions | `POST /api/platform-actions/register` |
| 3 | Wait for admin approval, then set referral rates (fixed or percentage) | `POST /api/referral-rates` |
| 4 | (Optional) Provide a webhook URL to receive events from B2H | `PUT /platforms/me/webhook-url` |
| 5 | Send conversion webhooks when users convert via referral codes | `POST /api/webhooks/external-conversion` |
| — | (Optional) Receive commission-paid notifications back from B2H | Your webhook URL (via `X-B2H-Event`) |

---

## 2. Prerequisites & Credentials

You need three pieces of information from your B2H administrator or the platform record:

> **🚨 BEFORE USING THIS GUIDE: Identify your platform and use its credentials.**

| Platform | API Key | Webhook Secret | Platform UUID |
|----------|---------|---------------|---------------|
| Dad's BookShelves | `b2h_50556e66-7f15-40bd-b0ef-842f776c6966` | `whsec_test_dads_bookshelves_abc123def456ghi789jkl012mno345pqr678stu901vwx234yza567bcd` | `3ee6c447-128f-46fa-b248-7f7e90d59d38` |
| **BitTutorConnect** | **`b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab`** | **`whsec_test_tutorconnect_xyz789abc012def345ghi678jkl901mno234pqr567stu890vwx1`** | **`b552099e-987c-4109-bdc8-8b7600600752`** |
| PayDebt Technologies | `b2h_ca4baf52-b2f9-4dbb-b8f3-6dd445ef1e19` | `whsec_test_paydebt_qwe123rty456asd789fgh012jkl345zxc678vbn901mnb234vcx567` | `ad06c2af-a7a0-4026-bbe6-c26fae29941c` |
| PhotoMart | `b2h_a7d5d626-7246-4f4a-afbf-9a37d6b2113d` | `whsec_test_photmart_aaa11222bbb333ccc444ddd555eee666fff777ggg888` | `1e0575d7-80d8-4de8-82fb-a8552df10fe0` |
| Virtual Assistance | `b2h_a2e955be-c92f-4bfc-9fb4-11363cf74586` | `whsec_test_virtual_assistance_ttt999uuu888iii777ooo666ppp555nnn444mmm333lll` | `b1353dbf-d4b5-4dea-bdda-d2c8b8fe8073` |
| Home & Away Services | `b2h_f4adc2f8-1a6d-4bdb-9c61-de865bd6c60e` | `whsec_test_home_away_hhh111aaa222bbb333ccc444ddd555eee666fff777` | `bb115a3a-b212-46c7-99b7-dda6551ef844` |
| LinkPal Bits Online | `b2h_9671fc3d-c461-4528-9fdf-b61483a5652b` | `whsec_test_linkpal_lll999ppp888ooo777nnn666mmm555kkk444jjj333iii222` | `32822149-c8a6-4561-89cc-7ca58a123530` |
| Booking Services | `b2h_f5673535-bea7-4162-8a6a-4d647f97e8b9` | `whsec_test_booking_bbb111ccc222ddd333eee444fff555ggg666hhh777iii` | `39fcaee2-6319-4718-9bdc-f31edd5365d5` |
| Business Hub | `b2h_2abbfebe-01bc-4434-9a73-b4378bfa08ba` | `whsec_test_business_hub_ooo111ppp222qqq333rrr444sss555ttt666uuu777vvv` | `1e800d20-fa1e-4ff0-b5a4-9fde681226ae` |
| Campus Connect | `b2h_fe05eadb-a78e-4ede-94cf-408ef6d8e449` | `whsec_test_campus_connect_nnn111ooo222ppp333qqq444rrr555sss666ttt777` | `668fec80-a897-436f-828e-cd482a88fab3` |

If you are developing for **BitTutorConnect**, always use the **BitTutorConnect** row. Never mix credentials from different platforms. All code examples below use BitTutorConnect values. Substitute your own platform's values if integrating a different partner.

> ⚠️ Your API key is shown here for reference. Treat it like a password — do not commit it to public repos. Webhook secrets should be stored securely and never committed to source control.

### Platform Identifiers (Names)

| Platform Name | Platform UUID |
|---------------|---------------|
| Bits TutorConnect | `b552099e-987c-4109-bdc8-8b7600600752` |
| PayDebt Technologies | `ad06c2af-a7a0-4026-bbe6-c26fae29941c` |
| Bits PhotoMart | `1e0575d7-80d8-4de8-82fb-a8552df10fe0` |
| Virtual Assistance | `b1353dbf-d4b5-4dea-bdda-d2c8b8fe8073` |
| Bits Home & Away Services | `bb115a3a-b212-46c7-99b7-dda6551ef844` |
| Dad's BookShelves | `3ee6c447-128f-46fa-b248-7f7e90d59d38` |
| LinkPal Bits Online | `32822149-c8a6-4561-89cc-7ca58a123530` |
| Bits Booking Services | `39fcaee2-6319-4718-9bdc-f31edd5365d5` |
| Bits Business Hub | `1e800d20-fa1e-4ff0-b5a4-9fde681226ae` |
| Bits Campus Connect | `668fec80-a897-436f-828e-cd482a88fab3` |

---

## 3. Base URLs

All B2H API endpoints are hosted on the **B2H server**. Partner platforms (like BitTutorConnect) call these endpoints remotely — they do **not** host these endpoints themselves.

| Who | Base URL | Context |
|-----|----------|---------|
| **Single-platform developers** (external partners only) | `https://api.bitshustlehubs.co.ke/api` | Production — only this URL applies |
| **B2H developers** (building/testing the partner integration locally) | `http://localhost:5000/api` | Internal testing — run `flask run` from `flask-api/`, then point the partner client here |

> **🚨 Critical distinction:**
> - **Partner platforms** (e.g., BitTutorConnect) = **clients** that **call** B2H's APIs. They do not expose these endpoints.
> - **B2H server** = the system that **hosts** these endpoints (`/api/platform-actions/register`, `/api/referral-rates`, `/api/webhooks/external-conversion`).
>
> **If you are developing BOTH B2H and a partner platform** (e.g., BTC as a single developer): Run the B2H Flask API locally on `localhost:5000`, then configure the partner platform to call `http://localhost:5000/api` for end-to-end integration testing. Switch to the production URL before deploying.

---

## 4. Authentication

B2H uses two authentication mechanisms for third-party integration:

### 4.1 API Key Authentication

Used for **management endpoints** (registering actions, setting rates, retrieving platform info).

- **Header:** `X-API-Key: <your-api-key>`
- The key is matched against a SHA-256 hash stored in the `platform_api_keys` table.
- Each API key has **scopes** that determine what operations it can perform.
- Default scopes for a new key: `actions:create`, `rates:create`, `rates:update`

**Scope reference:**

| Scope | Required for |
|-------|-------------|
| `actions:create` | `POST /api/platform-actions/register` |
| `rates:create` | `POST /api/referral-rates` |
| `rates:update` | `POST /api/referral-rates`, `DELETE /api/referral-rates/<id>` |
| `rates:read` | `GET /api/referral-rates` |

> Note: `GET /platforms/me` and `PUT /platforms/me/webhook-url` require a valid API key but do not check a specific scope.

### 4.2 Webhook Signature Authentication

Used for **inbound webhook endpoints** (sending conversions to B2H).

- **Header:** `X-Webhook-Signature: <hmac-sha256-hex>`
- The signature is an HMAC-SHA256 of the **canonical JSON payload** signed with the platform's **webhook secret**.
- B2H also validates that the `timestamp` field in the payload is within **5 minutes** (300 seconds) of server time to prevent replay attacks.

### 4.3 B2H Outbound Webhook Signature

When B2H sends events **to** your platform, it uses:

- **Header:** `X-B2H-Signature: <hmac-sha256-hex>`
- **Header:** `X-B2H-Event: <event-type>`
- Signed with the same platform webhook secret.

---

## 5. Step 1: Discover Available Platforms

Before integrating, you can discover all registered Bits platforms (read-only, no authentication required):

```
GET {B2H_BASE}/api/platforms
```

**Response (200):**

```json
[
  {
    "id": "b552099e-987c-4109-bdc8-8b7600600752",
    "name": "BITS_TUTORCONNECT",
    "display_name": "Bits TutorConnect",
    "description": "...",
    "is_active": true
  }
]
```

---

## 6. Step 2: Register Your Platform Actions

Register **all actions** that can trigger ambassador commissions on your platform. Examples: `SUBSCRIPTION_SIGNUP`, `BORROW_FROM_LIBRARY`, `BOOK_SESSION`.

Each action must be **individually approved** by a B2H admin before it can be used in referral rate configuration or webhook payloads.

### Endpoint

```
POST {B2H_BASE}/api/platform-actions/register
```

### Headers

```
Content-Type: application/json
X-API-Key: b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Machine-readable action identifier (e.g., `BOOK_SESSION`). Must be unique across B2H. |
| `display_name` | string | Yes | Human-readable name (e.g., "Book a Session"). |
| `description` | string | No | Description of what the action represents. |
| `sortOrder` | integer | No | Display ordering. Defaults to 0. |

### Example

```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/platform-actions/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab" \
  -d '{
    "name": "START_TUTORING_SESSION",
    "display_name": "Start Tutoring Session",
    "description": "User completes their first tutoring session"
  }'
```

### Response (201)

```json
{
  "success": true,
  "message": "action registered — pending admin approval",
  "data": {
    "id": "uuid-here",
    "name": "START_TUTORING_SESSION",
    "display_name": "Start Tutoring Session",
    "description": "User completes their first tutoring session",
    "platform_id": "b552099e-987c-4109-bdc8-8b7600600752",
    "is_approved": false,
    "is_active": false
  }
}
```

### What Happens Next

1. The action is created with `is_approved: false` and `is_active: false`.
2. A B2H admin reviews pending actions in the admin dashboard.
3. Once approved, the action becomes `is_approved: true` and `is_active: true`.
4. If you have provided a webhook URL (Step 4), B2H sends an `action.approved` event to it.

### Listing Your Actions

```
GET {B2H_BASE}/api/platform-actions?platform_id=<your-platform-uuid>
```

This returns all **approved** actions for your platform. No authentication required.

---

## 7. Step 3: Configure Referral Rates

After your actions are approved, set the **commission rate** for each action. You can choose between:

- **Fixed amount:** Ambassador receives a fixed KES amount per conversion.
- **Percentage:** Ambassador receives a percentage of the transaction amount.

### Endpoint

```
POST {B2H_BASE}/api/referral-rates
```

### Headers

```
Content-Type: application/json
X-API-Key: b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab
```

### Request Body

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `platform_id` | string (UUID) | No | *(API key's platform)* | Your platform UUID. Can be omitted; B2H auto-associates it. |
| `tier` | string | No | `DEFAULT` | Ambassador tier. Use `DEFAULT` for a global rate. |
| `action` | string | No | `CONVERSION` | The action name this rate applies to. Should match a registered, approved action. |
| `rate` | number | Yes | — | The rate value. For fixed: KES amount. For percentage: % value. |
| `is_percentage` | boolean | No | `false` | If `true`, `rate` is treated as a percentage. Cannot exceed 100. |

### Fixed Amount Example (KES 50 per borrow)

```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/referral-rates \
  -H "Content-Type: application/json" \
  -H "X-API-Key: b2h_50556e66-7f15-40bd-b0ef-842f776c6966" \
  -d '{
    "platform_id": "3ee6c447-128f-46fa-b248-7f7e90d59d38",
    "tier": "DEFAULT",
    "action": "BORROW_FROM_LIBRARY",
    "rate": 50.0
  }'
```

### Percentage Example (8% of session fee)

```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/referral-rates \
  -H "Content-Type: application/json" \
  -H "X-API-Key: b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab" \
  -d '{
    "platform_id": "b552099e-987c-4109-bdc8-8b7600600752",
    "tier": "DEFAULT",
    "action": "BOOK_SESSION",
    "rate": 8.0,
    "is_percentage": true
  }'
```

**For percentage rates:** The `amount` field in your webhook payload determines the reward (e.g., amount 1500 with rate 8 = KES 120 reward).

### Response (201)

```json
{
  "success": true,
  "message": "rate saved",
  "data": {
    "id": "uuid-here",
    "platform_id": "b552099e-987c-4109-bdc8-8b7600600752",
    "tier": "DEFAULT",
    "action": "BOOK_SESSION",
    "rate": 8.0,
    "is_percentage": true,
    "is_active": true
  }
}
```

### Listing Rates

```
GET {B2H_BASE}/api/referral-rates?platform_id=<your-platform-uuid>
```

Requires API key with `rates:read` (or `rates:create`/`rates:update`) scope.

### Disabling a Rate

```
DELETE {B2H_BASE}/api/referral-rates/<rate_id>
```

This **soft-deletes** (disables) a rate. Requires API key with `rates:update` scope.

---

## 8. Step 4: Set Your Webhook URL (Optional)

If you want to receive events **from B2H** (e.g., when an action is approved, or when a commission is paid), provide a webhook URL where B2H can send outbound notifications.

### Endpoint

```
PUT {B2H_BASE}/platforms/me/webhook-url
```

### Headers

```
Content-Type: application/json
X-API-Key: b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `webhook_url` | string (URL) | Yes | Your HTTPS endpoint URL. Must start with `http://` or `https://`. |

### Example

```bash
curl -X PUT https://api.bitshustlehubs.co.ke/api/platforms/me/webhook-url \
  -H "Content-Type: application/json" \
  -H "X-API-Key: b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab" \
  -d '{
    "webhook_url": "https://your-platform.com/webhooks/bitshustle"
  }'
```

### Getting Your Platform Info

```
GET {B2H_BASE}/platforms/me
```

Returns your platform's details. The `webhook_secret` field is excluded from the response for security — use the value provided by your B2H admin.

---

## 9. Step 5: Track Conversions via Webhook

When a user signs up or completes a paid action using a B2H referral code, **immediately notify B2H** so the referring ambassador gets credited.

### Endpoint

```
POST {B2H_BASE}/api/webhooks/external-conversion
```

### Headers

```
Content-Type: application/json
X-Webhook-Signature: <hmac-sha256-hex>
```

### Signature Generation

The signature is an **HMAC-SHA256** of the **canonical JSON representation** of your payload, signed with your platform's **webhook secret**.

**Canonical JSON** means:
- Keys are sorted alphabetically
- No unnecessary whitespace
- Uses `(",", ":")` separators

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
        hashlib.sha256,
    ).hexdigest()
```

**Node.js:**

```javascript
import crypto from 'crypto';

function signPayload(payload, secret) {
  const payloadStr = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto
    .createHmac('sha256', secret)
    .update(payloadStr)
    .digest('hex');
}
```

> **Important:** You must sign the exact payload object you are sending — do not include the signature in the signed data. Compute the signature first, then send the payload + signature together.

### Timestamp Validation

Include a `timestamp` field in ISO 8601 UTC format (e.g., `"2026-06-05T06:00:00Z"`). B2H rejects webhooks where the timestamp is more than **5 minutes (300 seconds)** from the server's current time to prevent replay attacks. Generate the timestamp at the moment of sending.

### PENDING vs CONVERTED Flow

Use the `conversion_status` field to control when the ambassador gets paid:

| Scenario | `conversion_status` | `amount` | When to Send |
|----------|---------------------|----------|--------------|
| **Free signup platform** | `PENDING` | omit | When user signs up via referral link |
| **Free signup platform** | `CONVERTED` | required | When user later completes a paid action |
| **Paid subscription platform** | `CONVERTED` | required | Send immediately on signup (payment = conversion) |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `referral_code` | string | Yes | The referral code from the ambassador (e.g., `AMB123_REF`). Alternatively, use `referral_id`. |
| `action` | string | Yes | Registered action name (e.g., `BOOK_SESSION`). Defaults to `CONVERSION`. |
| `platform_id` | string (UUID) | Yes | Your platform's UUID. |
| `conversion_status` | string | Yes | `PENDING` or `CONVERTED`. |
| `amount` | number | Required for `CONVERTED` | Transaction/purchase amount (KES). For fixed-rate rewards, this can be the transaction value. For percentage rates, the reward = `amount × rate / 100`. |
| `timestamp` | string (ISO 8601 UTC) | Yes | When the webhook is sent. Must be within 5 minutes of server time. |
| `external_user_id` | string | Yes | Unique identifier for the user on your platform. |
| `email` | string | Yes (one of email/phone) | User's email address. |
| `email_verified` | boolean | Yes (if using email) | `true` if the email is verified. |
| `phone` | string | Yes (one of email/phone) | User's phone number. |
| `phone_verified` | boolean | Yes (if using phone) | `true` if the phone is verified. |
| `converted_at` | string (ISO 8601 UTC) | No | When the conversion actually happened. |
| `name` | string | No | User's full name. |

### Examples

#### Signup Webhook (Free Platform — PENDING)

```json
{
  "referral_code": "AMB123_REF",
  "action": "USER_SIGNUP",
  "platform_id": "b552099e-987c-4109-bdc8-8b7600600752",
  "conversion_status": "PENDING",
  "timestamp": "2026-06-05T06:00:00Z",
  "external_user_id": "tc_user_456",
  "email": "user@example.com",
  "email_verified": true
}
```

#### Conversion Webhook (BitTutorConnect — KES 2,500 session)

```json
{
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
}
```

### Idempotency

If B2H receives a webhook for a referral that has **already been processed as `CONVERTED`**, it returns `409 Conflict` with `"already processed"`. This is safe to retry — you do **not** need to track whether a conversion was already sent.

### Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success — conversion processed |
| 400 | Invalid payload (missing fields, bad format) |
| 401 | Invalid signature or authentication |
| 404 | Referral code not found |
| 409 | Already processed (idempotent — safe to retry) |
| 429 | Rate limit exceeded (100 requests/minute) |
| 500 | Server error — contact B2H support |

---

## 10. Step 6: Receive B2H Outbound Events (Optional)

If you have set a webhook URL (Step 4), B2H will send you events **from** B2H **to** your platform.

### Authentication

B2H signs outbound webhooks with your platform's **webhook secret**. Verify the signature using the same HMAC-SHA256 algorithm:

- Header: `X-B2H-Signature: <hmac-sha256-hex>`
- The signed payload is the exact JSON body sent in the request.
- Use `hmac.compare_digest()` in Python or `crypto.timingSafeEqual()` in Node.js to prevent timing attacks.

### Event Types

| Event Type | Sent When | `data` Contents |
|-----------|-----------|-----------------|
| `action.approved` | A platform action you registered has been approved by an admin | `{ id, name, display_name, is_approved, ... }` |
| `commission.paid` | An ambassador's wallet was credited for a referral conversion | `{ referral_id, amount, currency }` |

### Payload Format

```json
{
  "event_type": "commission.paid",
  "platform_id": "b552099e-987c-4109-bdc8-8b7600600752",
  "timestamp": "2026-06-05T06:00:00Z",
  "data": {
    "referral_id": "uuid-here",
    "amount": 200.0,
    "currency": "KES"
  }
}
```

### Handling Inbound Requests

1. Read the raw request body.
2. Compute HMAC-SHA256 of the raw body using your webhook secret.
3. Compare with `X-B2H-Signature` header (use constant-time comparison).
4. Read `X-B2H-Event` header to determine the event type.
5. Process the event.

---

## 11. Additional Endpoints

### Get Your Own Platform Info

```
GET {B2H_BASE}/platforms/me
```

Requires API key. Returns your platform record (with `webhook_secret` and `webhook_secret_hash` stripped).

### List All Platform Actions

```
GET {B2H_BASE}/platform-actions
GET {B2H_BASE}/platform-actions?platform_id=<uuid>
```

No authentication required. Lists all approved, active actions. Use `platform_id` to filter by your platform.

### List Pending Actions (Admin)

```
GET {B2H_BASE}/platform-actions/pending
```

Returns actions registered via API key but not yet approved by an admin. In production this may require admin JWT authentication.

---

## 12. Rate Limits

To protect the B2H API, the following rate limits apply:

| Endpoint Family | Limit |
|-----------------|-------|
| API key endpoints (`platform-actions/register`, `referral-rates`) | **60 requests per 60 seconds per IP** |
| Webhook endpoints (`external-conversion`, `external-lead-status`) | **100 requests per 60 seconds per IP** |

When a rate limit is exceeded, B2H returns:

```json
{
  "success": false,
  "message": "Rate limit exceeded. Please try again later.",
  "retry_after": 60
}
```

HTTP status code: **429 Too Many Requests**.

---

## 13. Response Envelope Format

All B2H API responses follow a consistent envelope structure.

### Success

```json
{
  "success": true,
  "message": "rate saved",
  "data": { ... }
}
```

### Error

```json
{
  "success": false,
  "message": "invalid or revoked API key"
}
```

### Pagination (list endpoints)

For list endpoints, the `data` field contains a paginated structure:

```json
{
  "success": true,
  "message": "success",
  "data": {
    "items": [ ... ],
    "total": 42,
    "page": 1,
    "pages": 5
  }
}
```

---

## 14. Error Handling & Response Codes

| Code | Meaning | When It Happens |
|------|---------|-----------------|
| 200 | Success | Endpoint processed successfully |
| 201 | Created | New resource created |
| 400 | Bad Request | Missing required fields, invalid format, invalid payload |
| 401 | Unauthorized | Missing `X-API-Key` header, invalid/revoked key, invalid/missing webhook signature |
| 403 | Forbidden | API key lacks required scope, or insufficient permissions |
| 404 | Not Found | Platform, action, or rate not found |
| 409 | Conflict | Webhook already processed (idempotent — safe to retry) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unrecoverable server error |

### Common Error Messages

| Message | Cause |
|---------|-------|
| `X-API-Key header required` | Missing the `X-API-Key` header |
| `invalid or revoked API key` | The API key doesn't match any active record |
| `insufficient scope: requires one of ...` | API key lacks the required scope |
| `action '<name>' already exists` | You already registered this action name |
| `platform '<id>' not found` | Invalid platform UUID |
| `invalid signature` | HMAC signature mismatch |
| `signature required` | Missing `X-Webhook-Signature` header |
| `referral_id or referral_code required` | Both referral identifiers missing from webhook |
| `external_user_id required` | Missing from webhook payload |
| `verified email or verified phone required` | Neither email+verified nor phone+verified provided |
| `referral code not found` | The referral code doesn't match any ambassador |
| `already processed` | Webhook for an already-CONVERTED referral (409) |

---

## 15. Complete Integration Examples

### Python (requests)

```python
import requests
import hmac
import hashlib
import json
from datetime import datetime, timezone

B2H_BASE = "https://api.bitshustlehubs.co.ke"  # Production
# B2H_BASE = "http://localhost:5000"            # Local testing
API_KEY = "b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab"  # TutorConnect's key
WEBHOOK_SECRET = "whsec_test_tutorconnect_xyz789abc012def345ghi678jkl901mno234pqr567stu890vwx1"  # Provided by B2H admin
PLATFORM_ID = "b552099e-987c-4109-bdc8-8b7600600752"  # TutorConnect UUID


def api_request(method, path, payload=None):
    """Helper for authenticated B2H Platform API calls."""
    headers = {"X-API-Key": API_KEY, "Content-Type": "application/json"}
    url = f"{B2H_BASE}{path}"
    if method == "GET":
        return requests.get(url, headers=headers, params=payload)
    return requests.request(method, url, headers=headers, json=payload)


def sign_payload(payload, secret):
    """Sign a webhook payload with HMAC-SHA256."""
    payload_str = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    return hmac.new(
        secret.encode("utf-8"),
        payload_str.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


# ── Step 2: Register TutorConnect-specific actions ──────────────────────────
def register_action(name, display_name, description=""):
    resp = api_request("POST", "/api/platform-actions/register", {
        "name": name,
        "display_name": display_name,
        "description": description,
    })
    resp.raise_for_status()
    return resp.json()


# Register all actions that trigger commissions
register_action("START_TUTORING_SESSION", "Start Tutoring Session",
                "User completes their first tutoring session")
register_action("BOOK_SESSION", "Book a Session",
                "User books a paid tutoring session")


# ── Step 3: Set referral rates for TutorConnect actions ─────────────────────
# Fixed rate: KES 200 per completed session
api_request("POST", "/api/referral-rates", {
    "platform_id": PLATFORM_ID,
    "tier": "DEFAULT",
    "action": "START_TUTORING_SESSION",
    "rate": 200.0,
    "is_percentage": False,
})

# Percentage rate: 8% of session fee goes to ambassador
api_request("POST", "/api/referral-rates", {
    "platform_id": PLATFORM_ID,
    "tier": "DEFAULT",
    "action": "BOOK_SESSION",
    "rate": 8.0,
    "is_percentage": True,
})

# View current rates
rates = api_request("GET", "/api/referral-rates", {"platform_id": PLATFORM_ID})
print("Current rates:", rates.json())


# ── Step 5: Send conversion webhook when user completes an action ──────────
def notify_b2h_conversion(referral_code, action, amount=None,
                        conversion_status="CONVERTED", **kwargs):
    """Send a conversion webhook to B2H."""
    payload = {
        "referral_code": referral_code,
        "action": action,
        "platform_id": PLATFORM_ID,
        "conversion_status": conversion_status,
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


# User books a KES 2,500 tutoring session via ambassador referral (8% = KES 200)
notify_b2h_conversion(
    referral_code="AMB123_REF",
    action="BOOK_SESSION",
    amount=2500.00,
    conversion_status="CONVERTED",
    external_user_id="tc_user_456",
    email="student@example.com",
    email_verified=True,
)

# User completes their first free session (fixed KES 200 reward)
notify_b2h_conversion(
    referral_code="AMB123_REF",
    action="START_TUTORING_SESSION",
    conversion_status="CONVERTED",
    external_user_id="tc_user_456",
    email="student@example.com",
    email_verified=True,
)


# ── Step 4 (Optional): Set webhook URL for inbound B2H events ──────────────
# Only if you want to receive action.approved and commission.paid events
api_request("PUT", "/platforms/me/webhook-url", {
    "webhook_url": "https://your-platform.com/webhooks/bitshustle"
})
```

### Node.js (fetch + crypto)

```javascript
import fetch from 'node-fetch';
import crypto from 'crypto';

const API_BASE = 'https://api.bitshustlehubs.co.ke/api';  // Production
// const API_BASE = 'http://localhost:5000/api';            // Local testing
const API_KEY = 'b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab';
const WEBHOOK_SECRET = 'whsec_test_tutorconnect_xyz789abc012def345ghi678jkl901mno234pqr567stu890vwx1';
const PLATFORM_ID = 'b552099e-987c-4109-bdc8-8b7600600752';

function signPayload(payload) {
  const payloadStr = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payloadStr)
    .digest('hex');
}

async function apiRequest(method, path, body = null) {
  const headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
  };
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const resp = await fetch(`${API_BASE}${path}`, options);
  return resp.json();
}

// Step 2: Register actions
async function registerAction(name, displayName, description = '') {
  return apiRequest('POST', '/platform-actions/register', {
    name, display_name: displayName, description
  });
}

registerAction('SUBSCRIPTION_SIGNUP', 'Subscription Signup');
registerAction('MAKE_PURCHASE', 'Make Purchase');
registerAction('COMPLETE_COURSE', 'Complete Course');

// Step 3: Set referral rates
// Fixed: {platform_id, tier: "DEFAULT", action: "action_name", rate: 100.0}
// Percentage: {platform_id, tier: "DEFAULT", action: "action_name", rate: 5.0, is_percentage: true}
await apiRequest('POST', '/referral-rates', {
  platform_id: PLATFORM_ID,
  tier: 'DEFAULT',
  action: 'SUBSCRIPTION_SIGNUP',
  rate: 5.0,
  is_percentage: true,
});

// Step 5: Send conversion webhook
async function sendConversionWebhook(referralCode, action, amount = null, conversionStatus = 'CONVERTED', extra = {}) {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const payload = {
    referral_code: referralCode,
    action,
    platform_id: PLATFORM_ID,
    conversion_status: conversionStatus,
    converted_at: now,
    timestamp: now,
    ...(amount && { amount }),
    ...extra,
  };
  const sig = signPayload(payload);

  return fetch(`${API_BASE}/webhooks/external-conversion`, {
    method: 'POST',
    headers: {
      'X-Webhook-Signature': sig,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).then(r => r.json());
}

// For paid subscription platforms - send CONVERTED directly on signup
await sendConversionWebhook('AMB123_REF', 'SUBSCRIPTION_SIGNUP', 5000.00, 'CONVERTED', {
  external_user_id: 'user_123',
  email: 'user@example.com',
  email_verified: true,
});

// For free signup platforms - send PENDING on signup, CONVERTED on paid action
await sendConversionWebhook('AMB123_REF', 'USER_SIGNUP', null, 'PENDING', {
  external_user_id: 'user_456',
  email: 'freeuser@example.com',
  email_verified: true,
});
// Later when user pays:
await sendConversionWebhook('AMB123_REF', 'MAKE_PURCHASE', 1500.00, 'CONVERTED', {
  external_user_id: 'user_456',
  email: 'freeuser@example.com',
  email_verified: true,
});
```

### Verifying B2H Outbound Webhooks (Python Flask example)

```python
from flask import Flask, request, abort
import hmac
import hashlib
import json

app = Flask(__name__)
WEBHOOK_SECRET = "whsec_test_tutorconnect_xyz789abc012def345ghi678jkl901mno234pqr567stu890vwx1"

@app.route("/bitshustle/webhook", methods=["POST"])
def handle_b2h_webhook():
    signature = request.headers.get("X-B2H-Signature", "")
    event_type = request.headers.get("X-B2H-Event", "")
    raw_body = request.get_data(as_text=True)

    expected_sig = hmac.new(
        WEBHOOK_SECRET.encode("utf-8"),
        raw_body.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(signature, expected_sig):
        abort(401)

    payload = json.loads(raw_body)
    if event_type == "action.approved":
        print(f"Action approved: {payload['data']['name']}")
    elif event_type == "commission.paid":
        print(f"Commission paid: {payload['data']['amount']} {payload['data']['currency']}")

    return "", 200
```

---

## 16. Testing

### Test Webhook Signature

**Production:**

```bash
curl -X POST https://api.bitshustlehubs.co.ke/api/webhooks/external-conversion \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: test-signature" \
  -d '{"referral_code":"TEST_REF","action":"CONVERSION","platform_id":"test","conversion_status":"CONVERTED","timestamp":"2026-05-27T10:30:00Z"}'
```

**Localhost:**

```bash
curl -X POST http://localhost:5000/api/webhooks/external-conversion \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: test-signature" \
  -d '{"referral_code":"TEST_REF","action":"CONVERSION","platform_id":"test","conversion_status":"CONVERTED","timestamp":"2026-05-27T10:30:00Z"}'
```

**Expected response:** `401` with `{"success": false, "message": "invalid signature"}`.

### Verify Action Registration

```bash
curl -X GET https://api.bitshustlehubs.co.ke/api/platform-actions \
  -H "X-API-Key: b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab"
```

Returns all approved actions visible to your platform.

### Verify Rate Configuration

```bash
curl -X GET "https://api.bitshustlehubs.co.ke/api/referral-rates?platform_id=b552099e-987c-4109-bdc8-8b7600600752" \
  -H "X-API-Key: b2h_335ca26b-6d7b-4b6b-b838-faa62374d3ab"
```

---

## 17. Security Best Practices

1. **Never commit credentials to source control.** Store `API_KEY`, `WEBHOOK_SECRET`, and `PLATFORM_ID` in environment variables or a secrets manager.

2. **Use HTTPS everywhere.** All webhook endpoints and callbacks must use HTTPS in production.

3. **Validate webhook signatures.** Always verify `X-Webhook-Signature` (inbound) and `X-B2H-Signature` (outbound) using HMAC-SHA256 with constant-time comparison (`hmac.compare_digest` in Python, `crypto.timingSafeEqual` in Node.js).

4. **Enforce timestamp freshness.** Reject webhooks where the `timestamp` is older than 5 minutes to prevent replay attacks.

5. **Hash API keys.** B2H hashes your API key with SHA-256 before storage. The raw key string is never stored.

6. **Scope your API keys.** When requesting or rotating keys, request only the scopes you need:
   - `actions:create` — register actions
   - `rates:read` — view rates
   - `rates:create` — add rates
   - `rates:update` — modify/disable rates

7. **Handle 409 responses idempotently.** If you receive `409 Conflict` ("already processed") for a webhook, it means the conversion was already recorded — do not retry or error.

8. **Respect rate limits.** Implement exponential backoff if you receive `429 Too Many Requests`. The `retry_after` field in the response indicates how many seconds to wait.

9. **Log webhook processing outcomes.** Record successful and failed webhook deliveries for debugging and auditing.

---

## 18. Credential Recovery

### Lost API Key

If you lose or compromise your API key:

1. Contact your B2H admin immediately.
2. The admin navigates to the B2H admin dashboard.
3. Go to **Platform Integrations** → Select your platform.
4. Click **Regenerate API Key** (optionally select new scopes).
5. Copy the new key string (shown once) and share it securely with your team.
6. Update all API calls to use the new key. The old key becomes invalid immediately.

### Lost Webhook Secret

If you lose your webhook secret:

1. Contact your B2H admin immediately.
2. The admin navigates to the B2H admin dashboard.
3. Go to **Platform Integrations** → Select your platform.
4. Click **Regenerate Webhook Secret**.
5. Copy the new secret (shown once) and share it securely with your team.
6. Update all webhook signing code to use the new secret. Previous webhooks using the old secret will fail authentication.

> ⚠️ The old secret becomes invalid immediately after regeneration.

### Forgot Your Platform UUID

You can discover your platform UUID via:

```
GET {B2H_BASE}/platforms/me
```

or by listing all platforms:

```
GET {B2H_BASE}/api/platforms
```

---

## 19. Support

**Contact:** support@bitshustlehubs.co.ke

When contacting support, provide:

- Your platform name
- The specific endpoint or webhook you are having trouble with
- The exact error message received
- A redacted version of your request/response payloads (remove sensitive data)

---

## Platform-Specific Guides

For platform-specific action recommendations, rate examples, and tailored code snippets, see the individual partner guides in [`partners/`](./partners/):

| Platform | Guide |
|----------|-------|
| BitTutorConnect | [`BITTUTORCONNECT.md`](./partners/BITTUTORCONNECT.md) |
| Dad's BookShelves | [`DADS_BOOKSHELVES.md`](./partners/DADS_BOOKSHELVES.md) |
| PayDebt Technologies | [`PAYDEBT_TECHNOLOGIES.md`](./partners/PAYDEBT_TECHNOLOGIES.md) |
| PhotoMart | [`PHOTOMART.md`](./partners/PHOTOMART.md) |
| Virtual Assistance | [`VIRTUAL_ASSISTANCE.md`](./partners/VIRTUAL_ASSISTANCE.md) |
| Home & Away Services | [`HOME_AWAY_SERVICES.md`](./partners/HOME_AWAY_SERVICES.md) |
| LinkPal Bits Online | [`LINKPAL_BITS_ONLINE.md`](./partners/LINKPAL_BITS_ONLINE.md) |
| Booking Services | [`BOOKING_SERVICES.md`](./partners/BOOKING_SERVICES.md) |
| Business Hub | [`BUSINESS_HUB.md`](./partners/BUSINESS_HUB.md) |
| Campus Connect | [`CAMPUS_CONNECT.md`](./partners/CAMPUS_CONNECT.md) |
