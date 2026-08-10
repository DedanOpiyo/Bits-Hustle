# Bits Platform Attribution — Integration Gap Report

> **Scope:** `§9 Bits Platforms` in `docs/developers guide.md` lists 10 existing Bits product platforms.
> The BRD developer instruction (§19) states:
> - *Cross-Platform Referral: One referral code per ambassador works across all 10 platforms.*
> - *Platform Attribution: Every campaign, task, lead, and referral must be tagged to exactly one Bits platform.*
> - *Reporting: Include per-platform metrics (leads, conversions, commissions) in all admin reports.*
>
> **Generated:** 2026-05-19
> **How to use:** Each gap below has *Evidence* (file:line citation), *Why it's wrong*, and *Risk*.
> Each includes an integer **Fix-ID** for tracking.

---

## 1. Platform Metrics Report produces garbage data

**File:** `backend/src/controllers/reportController.ts:354`

```ts
// Report Controller — Platform Metrics Report
const platforms = ['TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'TWITTER', 'YOUTUBE', 'OTHER'];
```

This hardcodes 6 social-media channel labels that have **nothing to do with the 10 Bits platforms** listed in §9. The platform metrics report (`GET /reports/platform-metrics`) groups Campaign → Lead → Referral stats by these 6 labels. The result is always six buckets of zeros because no Campaign or Referral row ever has a `platform` matching those strings.

**Root cause:** The developer wrote a social-channel groupBy against `Campaign.platform` and `Referral.platform` but never reconciled those fields against the Bits product/platform taxonomy. Every Bit product is omitted.

**Fix-ID:** P-1

---

## 2. Platform metrics query groups `TaskSubmission` through `Task.platform` — but `Task` has no `platform` field

**File:** `backend/src/controllers/reportController.ts:330–340`

```ts
const platformTaskStats = await prisma.taskSubmission.groupBy({
  by: { task: { platform: true } },   // ← Task has no "platform" column
  ...
});
```

The Prisma schema confirms `Task` contains: `campaignId, typeId, description, reward, deadline` — **no `platform`**. The platform information lives on `Campaign.platformId → PlatformType`. This groupBy will fail at runtime with a `P2022` Prisma error (unknown column), or return empty rows if MariaDB silently aliases.

**Also:** the `by` path `task: { platform: true }` requires a `Task.platform` column that does not exist.

**Fix-ID:** P-2

---

## 3. Task CRUD does not tag tasks with a Bits platform

**Files:**
- `backend/src/controllers/taskController.ts:66–86` — `createTask`
- `backend/src/middleware/validators.ts:109–115` — `createTaskSchema`

```ts
// taskController.ts line 66-71
export const createTask = async (req, res) => {
  const { campaignId, type, description, reward, deadline } = req.body;
  const task = await prisma.task.create({
    data: { campaignId, type, description, reward, deadline },
    // No platformId — task is orphaned from its Bits platform
  });
```

When a task is created, the code reads `campaignId` from the schema but **never reads or stores the platform**. A task can be verified by its campaign record only. There is no `platformId` on `Task`, and there is no JOIN path from `Task → Campaign → PlatformType` in the task controller's query.

**Validators accept no platform field:**

```ts
// validators.ts line 109-115
export const createTaskSchema = z.object({
  campaignId: z.uuid(...),
  type: z.string(...),
  description: z.string(...),
  reward: z.number(...),
  deadline: z.coerce.date().optional(),
  // No platformId in schema
});
```

**Risk:** Every task, approval, rejection, and earnings event is invisible to the per-platform metric reports.

**Fix-ID:** P-3

---

## 4. Lead CRUD does not tag leads with a Bits platform

**Files:**
- `backend/src/controllers/leadController.ts:114–163` — `createLead`
- `backend/src/middleware/validators.ts:140–145` — `createLeadSchema`
- `backend/prisma/schema.prisma:247–259` — `Lead` model

```ts
// leadController.ts line 133-146
const lead = await prisma.lead.create({
  data: {
    ambassador: { connect: { id: ambassadorId } },
    campaign: { connect: { id: campaignId } },
    status: { connect: { id: "default-status-id" } },  // Always "default" hard-coded
    contactInfo: leadContactInfo,
    // No platformId — platform attribution silently dropped
  },
});
```

The validators also accept `campaignId` but **no `platformId`**:

```ts
// validators.ts line 140-145
export const createLeadSchema = z.object({
  ambassadorId: z.uuid(...),
  campaignId: z.uuid(...),
  contactInfo: z.unknown(),
  // No platformId field
});
```

The Prisma `Lead` model does have `statusId`, but `campaignId` links to `Campaign` which has `platformId`. The controller never traverses `campaign.platformId` when inserting or querying leads. The `getAllLeads` response at line 25 returns the `id, ambassadorId, contactInfo, status, createdAt` — no platform field at all.

**Risk:** Lead count per platform is always meaningless; `GET /reports/leads?platform=BITS_TUTORCONNECT` returns 0.

**Fix-ID:** P-4

---

## 5. Referral platform mismatch — schema uses UUID FK, controller treats it as a string

**Files:**
- `backend/prisma/schema.prisma:261–271` — `Referral` model
- `backend/src/controllers/referralController.ts:61–83` — `createReferral`
- `backend/src/middleware/validators.ts:153–157` — `createReferralSchema`

```ts
// Schema — platformId is a FK to PlatformType.id (UUID string)
model Referral {
  id            String   @id @default(uuid())
  ambassadorId  String
  platformId    String          // ← FK to PlatformType.id
  ...
}

// Validator — platformId validated as UUID
export const createReferralSchema = z.object({
  ambassadorId: z.uuid(...),
  referredUserId: z.uuid(...),
  platformId: z.uuid("Invalid platform ID format"),   // UUID expected
});

// Controller — writes a plain string
const referral = await prisma.referral.create({
  data: { ambassadorId, platform, referredUserId, status },
  // "platform" is a freeform string, not the UUID platformId
});
```

The controller at line 64 receives `platform` (a string) from `req.body`, discarding the `platformId` UUID validated by Zod. It then inserts that free-string into the `platform` column (or the column is unknown to the ORM). If the ORM is configured to map `platformId` column, this write will either:
1. Fail with a schema error, or
2. Insert garbage data if Prisma tolerance allows it.

Either way, **cross-platform referral tracking is broken at write time**. The notification message at line 173 (`Join us on ${referral.platform}`) is the only trace of platform context.

**Fix-ID:** P-5

---

## 6. Referral chain breaks at ambassador signup — `ref=` query param is silently discarded

**File:** `backend/src/controllers/authController.ts:136–241` — `registerAmbassador`

```ts
// authController.ts line 171-202
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: { email, password: hashedPassword, ... } });
  const ambassador = await tx.ambassador.create({
    data: {
      userId: user.id,
      hubId,
      referralCode: referralCode || `AMB-${user.id.substring(0, 8)}`, // ← Only used as "my new code", never "who referred me"
    },
  });
  const wallet = await tx.wallet.create({ ... });
  return { user, ambassador, wallet };
});
// NO referral record is created or looked up
```

The frontend correctly generates a signup link:

```ts
// Referrals.tsx line 69-71
const referralLink = `${window.location.origin}/auth/register?ref=${myReferralCode}`;
```

And the validator (`registerAmbassadorSchema` line 37–44) accepts `referralCode`, but the controller **only uses it as the new ambassador's own code**. The referring ambassador is never credited, no referral record is created, and no `referredUserId` is ever stored.

**Fix-ID:** P-6

---

## 7. Frontend Campaigns page has no platform filter or per-platform breakdown

**File:** `frontend/src/pages/Campaigns.tsx`

The `columns` array includes `{ key: 'platform', label: 'Platform' }` — so the column is rendered — but:

1. No column transform exists to resolve `platformId → displayName`. The `DataTable` renders whatever raw value `campaign.platform` returns (likely a UUID or object).
2. No filter bar exists to let the admin filter campaigns by Bits platform.
3. The `Analytics` page renders a "Leads by Platform" pie chart (`Analytics.tsx:224–249`) — it asks the backend for it, but the backend `getPlatformMetricsReport` sends hardcoded social-channel labels (Fix P-1).

**Fix-ID:** P-7

---

## 8. Campaign platform filter in `getCampaignReport` queries `platform` column — but `Campaign.platform` is not `platformId`

**File:** `backend/src/controllers/reportController.ts:160–229` — `getCampaignReport`

```ts
const where: any = {};
if (platform) where.platform = platform;      // ← Treated as raw string
```

The `Campaign` model has `platformId: String` — a FK to `PlatformType.id` (UUID). The report filter tries to match against a `platform` string column (the human-readable name like `Bits TutorConnect`), not the UUID `platformId`. This means:

> `GET /reports/campaigns?platform=Bits+TutorConnect` → always returns 0 hits

The correct filter must join through `PlatformType` or resolve `platformId` to the correct UUID before querying.

**Fix-ID:** P-8

---

## 9. Finance report uses wrong Transaction type labels

**File:** `backend/src/controllers/reportController.ts:270–281` — `getFinanceReport`

```ts
const totalIncome = reportData
  .filter(row => (row['Type'] as string) === 'CREDIT')    // ← "CREDIT"
  .reduce((sum, row) => sum + (row['Amount'] as number), 0);
const totalExpense = reportData
  .filter(row => (row['Type'] as string) === 'DEBIT')     // ← "DEBIT"
  .reduce(...);
```

The backend constants define `TRANSACTION_TYPE.EARNING = "EARNING"` and `TRANSACTION_TYPE.WITHDRAWAL = "WITHDRAWAL"`. The validators also accept `EARNING | WITHDRAWAL | BONUS | PENALTY | ADJUSTMENT`. There is no `CREDIT` or `DEBIT` entry anywhere in the codebase. The finance report summary will **always show 0** for income and expense because it filters for values that are never written to the database.

**Fix-ID:** P-9

---

## 10. `Campaign.createdById` — partner ownership lookup is broken

**File:** `backend/src/routes/partnerRoutes.ts:34` — `POST /partners/me/campaigns`
**File:** `backend/src/controllers/reportController.ts:117–131` — partner stats

```ts
// partnerRoutes.ts line 34
const campaigns = await prisma.campaign.findMany({
  where: { createdById: userId },      // ← Field does not exist in Prisma schema
```

The `Campaign` Prisma model has **no `createdById` / `createdBy` column**. This means:
- Partner "My Campaigns" returns **always empty**
- Partner "My Stats" non-zero campaigns/lads count is **always 0**
- All platform attribution for partner campaigns is also **always 0**

This cascades: without `createdById`, the partner portal has no data to attribute to any Bits platform.

**Fix-ID:** P-10

---

## 11. No bits-platform-based dynamic filter in `Leads` frontend page

**File:** `frontend/src/pages/Leads.tsx`

There is no platform filter on the leads page. The `ContactInfo` JSON is the only platform context reachable on a lead row. Given Fix P-4 (no `platformId` on the Lead model at query time), even if the backend were fixed, the frontend would silently skip this data.

**Fix-ID:** P-11

---

## 12. `Referrals` page — platformResolver returns raw object keys, not display names

**File:** `frontend/src/pages/Referrals.tsx:80–88`

```ts
const resolvePlatform = (r: Referral): string => {
  const p = (r as any).platform;
  if (typeof p === 'string') return p;
  if (p != null) {
    if (typeof p.displayName === 'string') return p.displayName;
    if (typeof p.name === 'string') return p.name;
  }
  return 'Unknown';
};
```

This defensive resolver tries `displayName` then `name` on the `platform` object path — but the `Referral` type in `types.ts` has `platform: Platform` (an object, not a FK id string). In most API responses, `platform` is returned as just the `PlatformType.name` string (e.g. `"BITS_TUTORCONNECT"`). The `platformLabel` map at line 12–23 handles the PascalCase→display-name mapping, and this works. **So this particular gap is cosmetic**, but the live app references it once at line 131–138 for the search bar filter — a string match against the label, not an FK lookup. The search will skip referrals whose `platform` is not in the label map.

**Fix-ID:** P-12

---

## 13. Checklist of each Bits platform attribution target

| Entity | Must carry platform tag | Currently tagged | Gap location |
|--------|------------------------|-----------------|-------------|
| **Campaign** | ✅ `platformId → PlatformType` | ✅ FK stored, but report filter wrong (P-8) | `reportController.ts:165` |
| **Task** | Must inherit from Campaign or carry own | ❌ No platform field or lookup | P-3 |
| **Lead** | Must inherit from Campaign | ⚠️ `campaignId` exists, controller never traverses `campaign.platformId` | P-4 |
| **Referral** | Must link to a `PlatformType` record | ⚠️ Schema has `platformId` FK, but controller writes free string | P-5 |
| **Ambassador** | Platform affinity via `Referral.platformId`, not own | ✅ Indirectly via Referral | — |
| **Wallet transactions** | Inherit platform from source entity | ⚠️ `Transaction` has `referenceId` only; platform resolved at query time | — |
| **Platform Metrics Report** | All 10 platforms in every report | ❌ Hardcoded social-channel labels | P-1 |
| **Platform Metrics Report — Tasks** | Via Campaign platform FK | ❌ `Task.platform` column doesn't exist; groupBy path is invalid | P-2 |

---

## Fix-ID Index (Quick Reference)

| ID | File | Line | What to fix |
|----|------|------|-------------|
| P-1 | `reportController.ts` | 354 | Replace hardcoded social-channel labels with `PlatformType.name` lookup |
| P-2 | `reportController.ts` | 330–340 | Rewrite task platform groupBy to join through `Campaign.platformId` |
| P-3 | `taskController.ts` + `validators.ts` | 66 / 109 | Add `platformId` to task CRUD and validator |
| P-4 | `leadController.ts` + `validators.ts` | 133 / 140 | Store `platformId` on lead; always return it |
| P-5 | `referralController.ts` | 64 | Switch from `platform` string to `platformId` UUID FK write |
| P-6 | `authController.ts` | 171–202 | On `POST /auth/register`, look up and credit referring ambassador from `ref` code |
| P-7 | `Campaigns.tsx` + `Analytics.tsx` | 12 / 224 | Add platform filter UI; render display names from `platformId` |
| P-8 | `reportController.ts` | 165 | Resolve `platformId` UUID before filtering campaigns by platform |
| P-9 | `reportController.ts` | 270–281 | Switch `CREDIT/DEBIT` to `EARNING/WITHDRAWAL` |
| P-10 | `schema.prisma` + `partnerRoutes.ts` | / / 34 | Add `createdById` to Campaign model + seed data |
| P-11 | `Leads.tsx` | — | Add platform filter after backend P-4 is resolved |
| P-12 | `Referrals.tsx` | 131–138 | Verify label map covers all platform enum keys |
