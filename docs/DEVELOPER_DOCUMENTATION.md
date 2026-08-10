# Bits Hustle Hub Developer Documentation

Version: 1.0  
Last updated: 2026-07-23  
Primary application path: `pyapp/`

## 1. Purpose

This document is the technical onboarding and implementation guide for developers working on Bits Hustle Hub, also known as B2H. It explains the application architecture, local setup, backend and frontend structure, domain model, APIs, authentication, workflows, testing, deployment, and coding conventions.

Use this document together with the business requirements guide in `docs/developers guide.md` and deployment guides in `pyapp/DEPLOYMENT.md`, `pyapp/DEPLOYMENT-samedomain.md`, and `pyapp/DEPLOYMENT-sharedhost.md`.

## 2. Product Summary

Bits Hustle Hub is a campus-based ambassador, hub operations, lead generation, referral attribution, task management, wallet, payout, analytics, and managed gig assignment platform.

The system supports:

- Ambassador onboarding and profile management.
- Hub management and hub attendance.
- QR and manual check-in/check-out.
- Campaign and task creation.
- Task submission, review, approval, rejection, and appeals.
- Lead capture and duplicate/fraud monitoring.
- Cross-platform referral tracking.
- Wallet balances, transactions, and payout requests.
- Finance dashboards and payout approvals.
- Notifications, announcements, and learning resources.
- Leaderboards, badges, tiers, and activity feeds.
- Role and permission administration.
- Platform integrations, platform API keys, webhooks, referral rates, and platform actions.
- Managed gig assignments for clients, administrators, and gig workers.

## 3. Repository Structure

```text
bitshustle/
├── docs/
│   ├── DEVELOPER_DOCUMENTATION.md
│   ├── developers guide.md
│   └── platform-attribution-gaps.md
└── pyapp/
    ├── flask-api/
    │   ├── app/
    │   │   ├── controllers/
    │   │   ├── models/
    │   │   ├── routes/
    │   │   ├── services/
    │   │   ├── utils/
    │   │   ├── config.py
    │   │   ├── extensions.py
    │   │   └── factory.py
    │   ├── migrations/
    │   ├── tests/
    │   ├── tools/
    │   ├── requirements.txt
    │   ├── run.py
    │   └── wsgi.py
    ├── frontend/
    │   ├── src/
    │   │   ├── components/
    │   │   ├── contexts/
    │   │   ├── hooks/
    │   │   ├── lib/
    │   │   ├── pages/
    │   │   ├── services/
    │   │   ├── App.tsx
    │   │   └── main.tsx
    │   ├── package.json
    │   ├── vite.config.ts
    │   └── tsconfig.json
    ├── docker-compose.prod.yml
    ├── Dockerfile.backend
    ├── Dockerfile.frontend
    └── nginx.conf
```

## 4. Technology Stack

### Backend

- Python Flask 3.
- Flask SQLAlchemy for ORM.
- Flask Migrate and Alembic for database migrations.
- Flask JWT Extended for authentication.
- Flask Bcrypt for password hashing.
- Flask CORS for browser access.
- PyMySQL for MySQL connectivity.
- Pydantic and pydantic-settings for validation/configuration where used.
- Requests for external HTTP integrations.
- ReportLab and OpenPyXL for report exports.
- Gunicorn for production WSGI serving.

### Frontend

- React 18.
- TypeScript.
- Vite.
- React Router DOM.
- TanStack React Query.
- Axios.
- Tailwind CSS 4 and DaisyUI.
- Lucide React icons.
- Framer Motion.
- QR libraries: `html5-qrcode`, `@yudiel/react-qr-scanner`, and `react-qr-code`.
- Vitest, Testing Library, and jsdom for frontend tests.

### Database and Infrastructure

- MySQL in development/production by default.
- SQLite in backend test configuration.
- Docker production artifacts are available.
- Shared-hosting WSGI/Passenger entry points are available.

## 5. Core Paths

| Area | Path |
| --- | --- |
| Backend application factory | `pyapp/flask-api/app/factory.py` |
| Backend config | `pyapp/flask-api/app/config.py` |
| Backend extensions | `pyapp/flask-api/app/extensions.py` |
| Backend models | `pyapp/flask-api/app/models/__init__.py` |
| Backend routes | `pyapp/flask-api/app/routes/` |
| Backend controllers | `pyapp/flask-api/app/controllers/` |
| Backend services | `pyapp/flask-api/app/services/` |
| Backend migrations | `pyapp/flask-api/migrations/` |
| Backend tests | `pyapp/flask-api/tests/` |
| Frontend app shell and routes | `pyapp/frontend/src/App.tsx` |
| Frontend API client | `pyapp/frontend/src/services/api.ts` |
| Frontend auth context | `pyapp/frontend/src/contexts/AuthContext.tsx` |
| Frontend pages | `pyapp/frontend/src/pages/` |
| Frontend reusable components | `pyapp/frontend/src/components/` |
| Frontend tests | `pyapp/frontend/src/**/*.test.tsx` and `pyapp/frontend/src/**/*.test.ts` |

## 6. Local Development Prerequisites

Install the following before running the project locally:

- Python 3.10 or newer.
- Node.js 18 or newer.
- npm.
- MySQL 8 or compatible MariaDB/MySQL server.
- Git.
- Optional: Docker and Docker Compose for production-like deployments.

Recommended Windows shell commands below use PowerShell syntax unless noted otherwise.

## 7. Backend Setup

From `pyapp/flask-api`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env` with local values:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-local-password
DB_NAME=bitshustle
JWT_SECRET_KEY=replace-with-a-local-secret
JWT_ACCESS_TOKEN_EXPIRES=86400
FLASK_ENV=development
FRONTEND_URL=http://localhost:5173
```

Create the local database:

```sql
CREATE DATABASE bitshustle CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Run migrations:

```powershell
flask --app wsgi.py db upgrade
```

Seed initial data if needed:

```powershell
python seed.py
```

Run the backend API:

```powershell
python run.py
```

The development server listens on `http://localhost:5000` and exposes:

- `GET /health`
- `GET /api`
- All registered API blueprints under `/api/*`.

## 8. Frontend Setup

From `pyapp/frontend`:

```powershell
npm install
```

Create a local environment file if needed:

```env
VITE_API_URL=http://localhost:5000/api
```

Run the frontend:

```powershell
npm run dev
```

The default Vite development URL is `http://localhost:5173`.

## 9. Useful Development Commands

### Backend

```powershell
# Run backend development server
python run.py

# Run migrations
flask --app wsgi.py db upgrade

# Create a migration after model changes
flask --app wsgi.py db migrate -m "describe change"

# Apply migrations
flask --app wsgi.py db upgrade

# Run backend tests
pytest
```

### Frontend

```powershell
# Start development server
npm run dev

# Build production bundle
npm run build

# Preview production bundle locally
npm run preview

# Run linting
npm run lint

# Run TypeScript type checking
npm run typecheck

# Run frontend tests
npm test
```

## 10. Backend Architecture

The backend follows a layered Flask architecture:

1. `factory.py` creates and configures the Flask app.
2. `extensions.py` initializes shared Flask extensions.
3. `config.py` reads environment variables and exposes development, testing, and production config classes.
4. `routes/` defines Flask blueprints and endpoint mappings.
5. `controllers/` contains request handling and orchestration logic.
6. `services/` contains reusable business logic such as wallets, tasks, tiers, webhooks, permissions, payouts, and M-Pesa integration.
7. `models/__init__.py` defines SQLAlchemy models.
8. `utils/` contains helpers for authentication, serialization, and API responses.

### Application Factory

The Flask app is created by `create_app()`. It:

- Loads `Config`, `DevConfig`, `TestConfig`, or `ProdConfig`.
- Initializes SQLAlchemy, migrations, bcrypt, JWT, and CORS.
- Registers all API blueprints with `/api` prefix.
- Auto-seeds default role types when the `role_types` table exists and is empty.
- Registers `/health` and `/api` diagnostic endpoints.

### Blueprint Registration

All active API blueprints are listed in `pyapp/flask-api/app/routes/__init__.py` and registered with the `/api` prefix.

Current major route groups include:

- `auth`
- `users`
- `ambassadors`
- `hubs`
- `wallets`
- `campaigns`
- `tasks`
- `task-submissions`
- `leads`
- `referrals`
- `check-ins`
- `announcements`
- `notifications`
- `support-tickets`
- `badges`
- `appeals`
- `payout-requests`
- `leaderboard`
- `learning-resources`
- `reports`
- `analytics`
- `fraud-alerts`
- `activity-feed`
- `audit-logs`
- `task-system`
- `platforms`
- `webhooks`
- `referral-rates`
- `role-types`
- `task-type-types`
- `tier-types`
- `action-types`
- `platform-api-keys`
- `platform-actions`
- `lead-status-types`
- `permissions`
- `role-permissions`
- `uploads`
- `assignments`
- `assignment-categories`

## 11. Backend Configuration

The backend reads configuration from environment variables via `python-dotenv`.

### Core Environment Variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `3306` |
| `DB_USER` | Database username | `root` |
| `DB_PASSWORD` | Database password | empty |
| `DB_NAME` | Database name | `bitshustle` |
| `JWT_SECRET_KEY` | JWT signing secret | `dev-secret-change-me` |
| `JWT_ACCESS_TOKEN_EXPIRES` | Token lifetime in seconds | `86400` |
| `FLASK_ENV` | Runtime environment | `development` |
| `FRONTEND_URL` | Allowed frontend origin | `http://localhost:5173` |

### Business Policy Variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `REFERRAL_ATTRIBUTION_DAYS` | Referral validity window | `30` |
| `MIN_PAYOUT_AMOUNT` | Minimum payout amount | `500` |
| `INACTIVITY_DAYS` | Ambassador inactivity threshold | `30` |
| `HUB_OPERATING_FEE_ENABLED` | Enable hub operating fee | `true` |
| `HUB_OPERATING_FEE_PERCENT` | Hub operating fee percentage | `10` |
| `LEAD_REWARD_AMOUNT` | Base lead reward | `50` |
| `REFERRAL_REWARD_AMOUNT` | Base referral reward | `100` |
| `LEAD_CONVERSION_REWARD_AMOUNT` | Lead conversion reward | `200` |

### Communications and Integrations

| Variable | Purpose |
| --- | --- |
| `SMTP_ENABLED` | Enable email sending |
| `SMTP_HOST` | SMTP host |
| `SMTP_PORT` | SMTP port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | Sender address |
| `SMS_ENABLED` | Enable SMS support |
| `SMS_PROVIDER` | SMS provider, for example `mobilesasa` or `twilio` |
| `MOBILESASA_API_KEY` | MobileSasa API key |
| `MOBILESASA_API_SECRET` | MobileSasa API secret |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `WHATSAPP_ENABLED` | Enable WhatsApp support |
| `WHATSAPP_TOKEN` | WhatsApp token |
| `WEBHOOK_SECRET` | Shared webhook secret |

### M-Pesa Variables

| Variable | Purpose |
| --- | --- |
| `MPESA_BASE_URL` | Daraja API base URL |
| `MPESA_CONSUMER_KEY` | Daraja consumer key |
| `MPESA_CONSUMER_SECRET` | Daraja consumer secret |
| `MPESA_SHORTCODE` | STK shortcode |
| `MPESA_PASSKEY` | STK passkey |
| `MPESA_CALLBACK_URL` | STK callback URL |
| `MPESA_B2C_SHORTCODE` | B2C shortcode |
| `MPESA_B2C_INITIATOR_NAME` | B2C initiator name |
| `MPESA_B2C_SECURITY_CREDENTIAL` | B2C encrypted credential |
| `MPESA_B2C_RESULT_URL` | B2C result URL |
| `MPESA_B2C_TIMEOUT_URL` | B2C timeout URL |
| `MPESA_B2C_COMMAND_ID` | B2C command ID |

### Task Queue Variables

| Variable | Purpose | Values |
| --- | --- | --- |
| `TASK_SO_MODE` | Background task behavior | `OFF`, `SYNC`, `CONSUME` |
| `TASK_SO_REDIS_URL` | Redis URL for queue mode | Redis URL |
| `TASK_SO_DEFAULT_QUEUE` | Default queue name | string |

## 12. Domain Model Overview

The main SQLAlchemy models are defined in `pyapp/flask-api/app/models/__init__.py`.

### Dynamic Type and Permission Tables

- `RoleType`: roles such as `SUPER_ADMIN`, `HUB_MANAGER`, `AMBASSADOR`, `FINANCE_OFFICER`, `SUPPORT_OFFICER`, `PARTNER_ADVERTISER`, `CLIENT`, `ADMIN`, and `GIG_WORKER`.
- `PlatformType`: Bits platform definitions and webhook metadata.
- `TierType`: ambassador tier definitions.
- `ActionType`: platform or referral action definitions.
- `PlatformApiKey`: API keys used by external platforms.
- `TaskTypeType`: task categories.
- `TaskStatusType`: task submission status values.
- `LeadStatusType`: lead status values.
- `PayoutStatusType`: payout status values.
- `Permission`: permission definitions.
- `RolePermission`: role-to-permission mappings.

### Core Entities

- `User`: authentication identity and role relationship.
- `Hub`: physical campus hub managed by a user.
- `Ambassador`: ambassador profile linked to a user and hub.
- `Wallet`: ambassador wallet aggregate.
- `Transaction`: earning or withdrawal ledger entry.
- `Campaign`: campaign for one Bits platform.
- `Task`: task under a campaign.
- `TaskSubmission`: ambassador proof submitted for a task.
- `Lead`: captured prospect attributed to an ambassador, campaign, and platform.
- `Referral`: cross-platform referral record.
- `CheckIn`: hub attendance record.
- `Announcement`: system or hub announcement.
- `Notification`: in-app notification.
- `SupportTicket`: support and dispute record.
- `LearningResource`: training resource.
- `Badge`: badge definition.
- `AmbassadorBadge`: badge award record.
- `Appeal`: task or payout appeal.
- `AuditLog`: auditable change log.
- `PayoutRequest`: ambassador withdrawal request.
- `UserSetting`: notification and user preference settings.
- `FraudAlert`: suspicious activity alert.
- `ReferralRate`: configurable rate by platform, tier, and action.

### Managed Gig Assignment Entities

- `Assignment`: client-submitted gig assignment.
- `Submission`: work submitted by a gig worker.
- `AssignmentMessage`: assignment discussion record.
- `AssignmentCategory`: configurable assignment category.
- `AssignmentWorker`: worker profile/activation record.

## 13. Official Bits Platform Names

Use these exact platform names in labels, dropdowns, seed data, exports, and reports:

1. Bits TutorConnect
2. PayDebt Technologies
3. Bits PhotoMart
4. Virtual Assistance
5. Bits Home & Away Services
6. Dad's BookShelves
7. LinkPal Bits Online
8. Bits Booking Services
9. Bits Business Hub
10. Bits Campus Connect

Do not abbreviate, reword, or change case unless product ownership explicitly approves the change and a migration plan is created.

## 14. Authentication and Authorization

### Authentication

- The backend uses JWT access tokens.
- Login returns a token consumed by the frontend.
- The frontend stores the token in `localStorage` under `token`.
- Axios attaches the token as `Authorization: Bearer <token>` for every authenticated request.
- On a `401` response, the frontend clears `token` and `user` from `localStorage` and triggers logout.

### Authorization

Authorization is role-based and permission-aware:

- Route-level frontend protection is implemented by `PrivateRoute` and `RoleRoute`.
- Backend roles are stored in `role_types`.
- Permissions are stored in `permissions` and connected through `role_permissions`.
- Admin UI routes exist for role and permission management.

### Frontend Role Routing

Common role redirects:

| Role | Default frontend destination |
| --- | --- |
| `SUPER_ADMIN` | `/dashboard` |
| `ADMIN` | `/gig-management` |
| `HUB_MANAGER` | `/hub-dashboard` |
| `FINANCE_OFFICER` | `/finance` |
| `SUPPORT_OFFICER` | `/support-tickets` |
| `CLIENT` | `/assignments` |
| `GIG_WORKER` | `/my-gigs` |
| `AMBASSADOR` | `/dashboard` |

## 15. Frontend Architecture

The frontend is a Vite React application.

### Main Application Layers

- `src/main.tsx`: React entry point.
- `src/App.tsx`: router, providers, protected route composition, and role-based route tree.
- `src/services/api.ts`: Axios client and endpoint wrappers.
- `src/contexts/AuthContext.tsx`: authentication state.
- `src/contexts/ToastContext.tsx`: toast notifications.
- `src/lib/queryClient.ts`: TanStack Query configuration.
- `src/components/`: shared layout, route guards, form helpers, loaders, wallet overview, and reusable UI.
- `src/pages/`: top-level route components.

### API Client Behavior

`src/services/api.ts` creates one Axios instance with:

- Base URL from `VITE_API_URL`, falling back to `/api`.
- JSON content type.
- Request interceptor that attaches JWT token.
- Response interceptor that unwraps backend response envelopes when `success === true`.
- Response interceptor that rejects backend envelopes where `success === false`.
- 401 handler that clears auth storage and logs the user out.

### Frontend Route Groups

| Route group | Roles |
| --- | --- |
| Public pages | all users |
| Ambassador dashboard, tasks, leads, referrals, wallet, QR check-in, learning hub, leaderboard, notifications | `AMBASSADOR`, `SUPER_ADMIN` |
| Managed gig assignments | `CLIENT`, `GIG_WORKER`, `ADMIN`, `SUPER_ADMIN` |
| Hub dashboard, attendance, ambassadors, QR, task review, announcements, attendance analytics | `HUB_MANAGER`, `SUPER_ADMIN` |
| Analytics, hub management, user management, permissions, type management, integrations, task assignment/edit | `SUPER_ADMIN` |
| Payouts and finance dashboard | `FINANCE_OFFICER`, `SUPER_ADMIN` |
| Support tickets | `SUPPORT_OFFICER`, `SUPER_ADMIN` |

## 16. API Surface Summary

The frontend wrappers expose the most commonly used backend route groups:

| Frontend API wrapper | Backend path family |
| --- | --- |
| `authAPI` | `/auth/*` |
| `hubAPI` | `/hubs/*`, `/public/hubs` |
| `roleTypeAPI` | `/role-types/*` |
| `permissionAPI` | `/permissions/*` |
| `rolePermissionAPI` | `/role-permissions/*` |
| `walletAPI` | `/wallets/*` |
| `ambassadorAPI` | `/ambassadors/*`, `/hubs/:id/ambassadors` |
| `taskAPI` | `/tasks/*`, `/task-submissions/*`, `/uploads/task-proof` |
| `assignmentAPI` | `/assignments/*`, `/public/assignments`, `/assignment-workers`, `/assignment-reports/*`, `/uploads/assignment-*` |
| `taskTypeAPI` | `/task-type-types` |
| `appealAPI` | `/my-appeals` |
| `payoutAPI` | `/payout-requests/*` |
| `campaignAPI` | `/campaigns/*`, `/partner/campaigns` |
| `analyticsAPI` | `/analytics/*` |
| `checkinAPI` | `/check-ins/*`, `/hubs/:id/qr-code` |
| `leadStatusTypeAPI` | `/lead-status-types` |
| `leadAPI` | `/leads/*` |
| `assignmentCategoryAPI` | `/assignment-categories/*` |
| `referralAPI` | `/referrals/*` |
| `learningResourceAPI` | `/learning-resources/*` |
| `leaderboardAPI` | `/leaderboard` |
| `announcementAPI` | `/announcements/*` |
| `platformAPI` | `/platforms/*` |
| `tierTypeAPI` | `/tier-types/*` |
| `actionTypeAPI` | `/action-types/*` |
| `referralRateAPI` | `/referral-rates/*` |
| `notificationAPI` | `/notifications/*` |
| `platformApiKeyAPI` | `/platform-api-keys/*` |
| `platformActionAPI` | `/platform-actions/*` |

## 17. Standard Backend Response Shape

Backend responses should be consistent. The frontend expects one of these shapes:

### Success Envelope

```json
{
  "success": true,
  "message": "Optional message",
  "data": {}
}
```

The Axios response interceptor unwraps this so UI code receives `data` directly.

### Error Envelope

```json
{
  "success": false,
  "message": "Human readable error message",
  "data": null
}
```

The frontend converts this into a rejected promise.

### Pagination Shape

For list endpoints, use:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pages": 1
}
```

## 18. Key Business Workflows

### Ambassador Registration and Onboarding

1. User registers or is created by an admin.
2. User receives a role.
3. Ambassador profile is linked to a hub.
4. Ambassador gets a unique referral code.
5. Wallet is created.
6. Ambassador can access dashboard, tasks, leads, referrals, wallet, QR check-in, learning hub, and leaderboard.

### Campaign and Task Workflow

1. Admin creates a campaign for a specific Bits platform.
2. Admin creates tasks under the campaign.
3. Ambassador views available tasks.
4. Ambassador submits proof.
5. Hub manager reviews submission.
6. Approved task credits wallet and transaction history.
7. Rejected task can include a rejection reason and may be appealed.

### Lead Capture Workflow

1. Ambassador captures lead contact info.
2. Lead is attached to ambassador, campaign, and platform.
3. Duplicate detection/fraud logic can flag suspicious data.
4. Lead status is updated through lifecycle states such as new/contacted/converted/lost depending on seeded status values.
5. Valid or converted leads can generate rewards.

### Referral Workflow

1. Ambassador shares referral code.
2. Referred user signs up for one Bits platform.
3. Referral record stores ambassador, platform, code used, action, status, and expiration.
4. Referral rates can vary by platform, ambassador tier, and action.
5. Converted referrals generate earnings if within attribution window.

### Attendance Workflow

1. Ambassador checks in manually or by scanning hub QR.
2. Attendance is stored with hub and check-in time.
3. Ambassador checks out.
4. Hub manager and admin dashboards can view attendance and trends.

### Wallet and Payout Workflow

1. Earnings are posted as transactions against wallet.
2. Wallet aggregate fields track current balance, pending earnings, total earned, and total withdrawn.
3. Ambassador requests payout if balance meets `MIN_PAYOUT_AMOUNT`.
4. Finance officer reviews payout request.
5. Approved payout may trigger M-Pesa B2C payout authorization.
6. Rejected payout stores a reason and may be appealed.
7. All manual or financial changes should be auditable.

### Managed Gig Assignment Workflow

1. Client submits assignment.
2. Admin reviews and assigns a worker.
3. Worker accepts or rejects assignment.
4. Worker submits deliverable file/link.
5. Admin/client reviews submission.
6. Reports, invoices, and worker earnings can be exported.

## 19. Data Integrity Rules

- Every wallet transaction must include a source reference where possible.
- Do not edit wallet balances directly without a transaction and audit trail.
- Every campaign must be attributed to one platform.
- Every task must be attributed to one platform.
- Every lead must be attributed to one platform.
- Duplicate leads must not generate duplicate commissions.
- Ambassadors must not approve their own task submissions.
- Payout requests below the minimum threshold should be rejected.
- Rejections should include clear reasons.
- Fraud strikes should follow the configured escalation matrix.
- Platform API keys and webhook secrets must never be exposed in plaintext after creation.

## 20. Database Migrations

Use Flask Migrate/Alembic for schema changes.

Recommended flow:

```powershell
cd pyapp/flask-api
flask --app wsgi.py db migrate -m "add meaningful migration name"
flask --app wsgi.py db upgrade
```

Migration guidelines:

- Review generated migrations before committing.
- Include both upgrade and downgrade logic when practical.
- Avoid destructive migrations without backups and approval.
- Seed new dynamic enum/type rows in seed scripts or explicit migration scripts.
- Keep model changes and migration files in the same pull request.

## 21. Seeding and Default Data

The app factory auto-seeds default roles only when the `role_types` table exists and is empty.

Additional seed scripts exist in `pyapp/flask-api`, including:

- `seed.py`
- `seed_missing.py`
- `update_seed_permissions.py`

When adding new required type values, update seed scripts and document the values.

Important default role names:

- `SUPER_ADMIN`
- `HUB_MANAGER`
- `AMBASSADOR`
- `FINANCE_OFFICER`
- `SUPPORT_OFFICER`
- `PARTNER_ADVERTISER`
- `CLIENT`
- `ADMIN`
- `GIG_WORKER`

## 22. Testing Strategy

### Backend Tests

Backend tests use pytest. The test configuration uses in-memory SQLite by default.

Run:

```powershell
cd pyapp/flask-api
pytest
```

Test areas to cover:

- Authentication and authorization.
- Role-restricted endpoints.
- Campaign/task creation and submission review.
- Wallet transaction integrity.
- Payout thresholds and review flow.
- Lead duplication and conversion.
- Referral attribution.
- Hub attendance and QR check-in.
- Platform integrations and webhook security.
- Assignment lifecycle.

### Frontend Tests

Frontend tests use Vitest, Testing Library, and jsdom.

Run:

```powershell
cd pyapp/frontend
npm test
```

Before merging frontend changes, run:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Test areas to cover:

- Route guards and role-based navigation.
- API wrapper behavior and error handling.
- Page loading, empty, success, and failure states.
- Form validation.
- Wallet and payout UI.
- Hub and QR flows.
- Dashboard calculations.

## 23. Coding Conventions

### Backend

- Keep endpoint mapping in `routes/` and request/business orchestration in `controllers/`.
- Put reusable domain logic in `services/`.
- Keep SQLAlchemy models declarative and avoid embedding complex request logic in models.
- Use UUID string primary keys consistently.
- Use UTC timestamps in the backend.
- Use clear status names and type tables instead of hard-coded magic strings where a dynamic type table already exists.
- Always validate user input before creating or updating records.
- Return consistent response envelopes.
- Use database transactions for multi-step wallet, payout, or approval operations.
- Add audit logs for sensitive operations.

### Frontend

- Keep API calls in `src/services/api.ts` or a dedicated service module.
- Keep route-level pages in `src/pages/`.
- Keep reusable UI in `src/components/`.
- Use React Query for server state where practical.
- Handle loading, empty, error, and success states explicitly.
- Respect role-based access from `App.tsx`.
- Avoid duplicating authorization logic in every component when a route guard can enforce it.
- Keep TypeScript types close to API usage or extract reusable types when shared.

## 24. Security Guidelines

- Never commit real `.env` secrets.
- Rotate `JWT_SECRET_KEY` if it has ever been exposed.
- Use strong database passwords in production.
- Use HTTPS in production.
- Set `FLASK_ENV=production` in production.
- Do not expose stack traces or debug mode in production.
- Hash API keys and webhook secrets.
- Validate file uploads by size, extension, and content type.
- Ensure uploaded files are not executable.
- Rate-limit sensitive endpoints where possible.
- Require authentication for all private API endpoints.
- Enforce backend authorization even if frontend route guards exist.
- Log security-sensitive actions to `AuditLog`.

## 25. File Uploads

Frontend upload endpoints currently include:

- `/uploads/task-proof`
- `/uploads/assignment-brief`
- `/uploads/assignment-deliverable`

Developer expectations:

- Use `multipart/form-data`.
- Validate uploads server-side.
- Store only safe paths or URLs in database fields.
- Avoid trusting client-side filenames.
- Consider malware scanning for production.
- Keep public/private access rules explicit.

## 26. Platform Integrations and Webhooks

The platform integration subsystem includes:

- `PlatformType` records.
- `PlatformApiKey` records.
- `ActionType` records linked to platforms.
- `ReferralRate` configuration.
- Platform actions awaiting approval.
- Webhook endpoints and metrics services.

Integration guidelines:

- Each external platform should have a platform record.
- API keys should be generated securely and stored as hashes.
- Webhooks should be authenticated with a shared secret or signature.
- Incoming webhook payloads should be validated before processing.
- Webhook processing should be idempotent.
- Failed webhook processing should be observable through logs/metrics.
- Platform attribution must be preserved across leads, referrals, transactions, campaigns, and reports.

## 27. M-Pesa Integration

M-Pesa configuration is controlled by environment variables. The service layer contains M-Pesa integration logic.

Development should use Safaricom sandbox credentials:

```env
MPESA_BASE_URL=https://sandbox.safaricom.co.ke
```

Production should use production credentials and production callback URLs:

```env
MPESA_BASE_URL=https://api.safaricom.co.ke
```

Payout implementation guidelines:

- Validate payout eligibility before initiating B2C.
- Store request metadata and result callbacks.
- Handle timeout callbacks.
- Do not mark payouts complete until confirmed.
- Keep finance officer approval separate from external payment execution.
- Never log full credentials or security credentials.

## 28. Observability and Troubleshooting

Useful health checks:

- `GET /health` should return `{"status":"ok"}`.
- `GET /api` should return API name and version.

Common log/output files currently present in the repository include local troubleshooting artifacts such as `flask.err`, `flask.txt`, and backend error/output files under `pyapp/flask-api/`. Treat these as operational artifacts, not source of truth.

Troubleshooting checklist:

1. Confirm backend `.env` values are loaded.
2. Confirm MySQL is running and credentials are correct.
3. Run migrations.
4. Confirm CORS `FRONTEND_URL` matches the browser origin.
5. Confirm frontend `VITE_API_URL` points to the correct backend `/api` root.
6. Check browser network tab for failing requests.
7. Check backend terminal/log output.
8. Verify JWT token exists and is not expired.
9. Confirm the user role has required access.
10. Confirm required seed/type records exist.

## 29. Deployment Overview

### Frontend Production Build

```powershell
cd pyapp/frontend
npm run typecheck
npm run lint
npm run build
```

The generated `dist/` directory should be served by Nginx, Apache, cPanel static hosting, or another web server.

### Backend Production Run

Production should run via WSGI, for example:

```powershell
cd pyapp/flask-api
$env:FLASK_ENV="production"
flask --app wsgi.py db upgrade
gunicorn --bind 0.0.0.0:5000 --workers 4 --access-logfile - wsgi:app
```

On Windows local development, use `python run.py`; Gunicorn is intended for Linux production environments.

### Docker Production

Production Docker assets are available under `pyapp/`:

- `docker-compose.prod.yml`
- `Dockerfile.backend`
- `Dockerfile.frontend`
- `nginx.conf`

Typical Docker deployment:

```powershell
cd pyapp
copy flask-api\.env.production flask-api\.env
docker compose -f docker-compose.prod.yml up -d
```

### Shared Hosting

Shared hosting entry points include:

- `pyapp/flask-api/wsgi.py`
- `pyapp/flask-api/wsgi_production.py`
- `pyapp/flask-api/wsgi_sharedhost.py`
- `pyapp/flask-api/passenger_wsgi.py`

Consult the shared-hosting deployment guides before changing these files.

## 30. Production Checklist

Before production deployment:

- Set `FLASK_ENV=production`.
- Use a strong `JWT_SECRET_KEY`.
- Configure production database credentials.
- Run migrations.
- Configure `FRONTEND_URL` accurately.
- Configure frontend `VITE_API_URL` accurately.
- Configure HTTPS.
- Configure SMTP if email is enabled.
- Configure M-Pesa production credentials if payments are enabled.
- Run backend tests.
- Run frontend lint, typecheck, tests, and build.
- Verify `/health`.
- Verify login, dashboard, task, lead, wallet, and payout workflows.
- Verify CORS and cookies/headers in browser.
- Confirm `.env` files are not committed.

## 31. Common Development Tasks

### Add a Backend Endpoint

1. Add or update a controller method in `app/controllers/`.
2. Add or update a route in `app/routes/`.
3. Register the blueprint in `app/routes/__init__.py` if it is a new route module.
4. Add service logic in `app/services/` if business rules are reusable.
5. Add or update models and migrations if persistence changes.
6. Add backend tests.
7. Add frontend API wrapper if the UI will consume it.
8. Add or update frontend page/component.

### Add a Database Field

1. Update the SQLAlchemy model.
2. Generate migration.
3. Review generated migration.
4. Apply migration locally.
5. Update serializers/controllers.
6. Update frontend types/UI if needed.
7. Add tests.

### Add a Frontend Page

1. Create the page under `src/pages/`.
2. Add any reusable components under `src/components/`.
3. Add API wrappers in `src/services/api.ts` if needed.
4. Add route entry in `src/App.tsx` under the correct role guard.
5. Add navigation link in the layout/sidebar/navbar if applicable.
6. Add tests.

### Add a New Role or Permission

1. Add role or permission records through seed/migration/admin UI.
2. Update backend authorization checks.
3. Update frontend `RoleRoute` usage if route access changes.
4. Update default redirect mapping if the new role has a dashboard.
5. Document the role.

## 32. Known Technical Debt and Improvement Areas

- Some generated or copied text files and log artifacts exist in source directories; consider cleaning operational artifacts from version control.
- `models/__init__.py` is large; consider splitting models into focused modules as the project grows.
- API response unwrapping should remain consistent across all backend controllers to avoid frontend ambiguity.
- Stronger runtime validation schemas can be added for more request payloads.
- Backend authorization should be audited endpoint-by-endpoint.
- File upload security should be hardened before scale.
- Background job behavior should be standardized if `TASK_SO_MODE=CONSUME` is used in production.
- Observability can be improved with structured logging, request IDs, and centralized error monitoring.

## 33. Glossary

| Term | Meaning |
| --- | --- |
| Ambassador | Student/youth participant who markets Bits platforms and earns rewards |
| Hub | Physical campus location where ambassadors check in and operate |
| Campaign | Marketing initiative tied to one Bits platform |
| Task | Work item under a campaign |
| Task Submission | Ambassador proof submitted for task review |
| Lead | Potential customer/contact captured by an ambassador |
| Referral | Signup or action attributed to an ambassador referral code |
| Wallet | Ambassador earnings account |
| Transaction | Wallet ledger entry |
| Payout | Withdrawal request or payment execution |
| Platform | One official Bits product or business line |
| Tier | Ambassador level used for rewards and progression |
| Fraud Alert | Record of suspicious ambassador activity |
| Assignment | Managed gig work request from a client |

## 34. Developer Handoff Notes

For any new feature, provide the following in the pull request or handoff:

- Business requirement summary.
- Backend endpoints changed.
- Database models/migrations changed.
- Frontend pages/components changed.
- New environment variables.
- Seed data required.
- Tests added or updated.
- Deployment or migration steps.
- Rollback considerations.

This discipline is especially important for wallet, payout, referral, platform attribution, and role/permission changes.
