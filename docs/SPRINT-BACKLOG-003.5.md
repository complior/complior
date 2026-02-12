# Sprint Backlog 003.5 — Stripe Checkout + Lead Gen + Pricing Frontend

**Sprint Goal:** Enable plan-aware registration with Stripe Checkout for paid plans, build public lead generation tools (Quick Check + Penalty Calculator), and implement the Pricing page — creating a complete signup-to-paid-trial funnel.
**Status:** Draft (awaiting PO approval)

**Capacity:** ~22 SP | **Duration:** 2 weeks
**Developers:** Max (Backend+QA), Nina (Frontend+UX)
**Baseline:** ~191 tests (Sprint 1-2 + Sprint 2.5 + Sprint 3) → **New: ~36 tests (total: ~227)**

> **Prerequisite:** Sprint 3 (ComplianceScore, Requirements API, Dashboard, Classification History, Catalog Alternatives) MUST be merged to develop before Sprint 3.5 starts. Sprint 3 provides: ComplianceScoreCalculator, requirements API, dashboard summary API, classification history API. Baseline tests: ~191.

**Development rules:** All implementation MUST comply with `docs/CODING-STANDARDS.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, and `docs/DATA-FLOWS.md`. In particular: DDD/Onion layers (domain → application → api), VM-sandbox (no `require()` in `app/`), CQS, factory functions instead of classes, Zod validation on all APIs, explicit `resolveSession`/`checkPermission` in every handler (except public endpoints), multi-tenancy via `organizationId`. Plan limits defined in `app/config/plans.js` (single source of truth). Stripe config in `app/config/stripe.js`.

---

## Dependencies Graph

```
US-038 (Stripe Checkout API) ──→ US-039 (Stripe Webhook) ──→ US-041 (Registration + Plan Selection)
US-040 (Quick Check API) — independent
US-042 (Pricing Page) — independent (frontend only, needs plan config)
US-043 (Quick Check Page) — depends on US-040
US-044 (Penalty Calculator Page) — independent (frontend only, pure client-side)
```

Backend: US-038 first, then US-039 and US-040 can run in parallel.
Frontend: US-042 and US-044 are independent. US-041 depends on US-038+US-039. US-043 depends on US-040.

---

## User Stories

### Phase 1: Backend — Stripe Integration (8 SP)

#### US-038: Stripe Checkout Session API (5 SP)

- **Feature:** 09 (partial) | **Developer:** Max

##### Description
As a user who selected a paid plan during registration, I want to be redirected to Stripe's hosted checkout page to enter my payment details, so that I can start my 14-day trial with the selected plan.

##### Implementation
- New: `app/config/stripe.js` — Stripe configuration (price IDs, webhook secret, plan mapping)
- New: `app/domain/billing/services/CheckoutSessionCreator.js` — domain service, pure validation logic
- New: `app/application/billing/createCheckoutSession.js` — application use case
- New: `app/application/billing/getCheckoutStatus.js` — application use case
- New: `app/api/billing/checkout.js` — POST handler (create session) + GET handler (check status)
- Modified: `server/lib/schemas.js` — `CheckoutCreateSchema`, `CheckoutStatusSchema`
- Modified: `server/main.js` — register billing routes

##### Acceptance Criteria
- [ ] `POST /api/billing/checkout` accepts `{planId, period}` and returns `{checkoutUrl}`
- [ ] Validates planId is a valid paid plan (starter/growth/scale) — rejects free/enterprise
- [ ] Validates period is 'monthly' or 'annual'
- [ ] Creates Stripe Checkout Session with: `mode: 'subscription'`, `trial_period_days: 14`, correct `stripePriceId` from config
- [ ] Sets `success_url` to `/checkout/success?session_id={CHECKOUT_SESSION_ID}` and `cancel_url` to `/pricing`
- [ ] Passes `metadata: {organizationId, userId}` to Stripe session
- [ ] Returns 409 if organization already has an active paid subscription
- [ ] Authenticated endpoint: requires valid Ory session
- [ ] `GET /api/billing/checkout-status?session_id=cs_xxx` returns subscription status for the success page polling
- [ ] Rate limited: 5 requests/user/minute

- **Tests:** 7 (stripe-checkout.test.js)
- **Dependencies:** None

---

#### US-039: Stripe Webhook Handler (3 SP)

- **Feature:** 09 (partial) | **Developer:** Max

##### Description
As a system, I want to process Stripe webhook events to update the subscription status in our database, so that the user's plan is activated after successful payment.

##### Implementation
- New: `app/application/billing/handleStripeWebhook.js` — application use case
- New: `app/api/webhooks/stripe.js` — POST handler (webhook endpoint)
- Modified: `server/main.js` — register webhook route (raw body parsing for signature verification)

##### Acceptance Criteria
- [ ] `POST /api/webhooks/stripe` receives and processes Stripe events
- [ ] Verifies webhook signature using `STRIPE_WEBHOOK_SECRET` — rejects invalid signatures with 400
- [ ] Handles `checkout.session.completed` event: updates Subscription with `planId`, `stripeSubscriptionId`, `stripeCustomerId`, `status: 'trialing'`, `currentPeriodEnd`
- [ ] Handles `invoice.paid` event: updates `currentPeriodEnd` for renewals
- [ ] Handles `invoice.payment_failed` event: sets subscription `status: 'past_due'`
- [ ] Handles `customer.subscription.deleted` event: sets subscription `status: 'cancelled'`, downgrades to free plan
- [ ] All mutations create AuditLog entries
- [ ] Returns 200 OK for all processed events (Stripe retry policy compliance)
- [ ] Returns 200 OK for unhandled event types (ignores gracefully)
- [ ] Public endpoint: no auth required (signature verification replaces auth)
- [ ] Idempotent: processing same event twice has no adverse effect

- **Tests:** 8 (stripe-webhook.test.js)
- **Dependencies:** US-038

---

### Phase 2: Backend — Quick Check API (2 SP)

#### US-040: Quick Check Public API + Domain Service (2 SP)

- **Feature:** 23 (partial) | **Developer:** Max

##### Description
As a visitor without an account, I want to answer 5 quick questions to find out if the AI Act applies to my company, so that I can assess the urgency of compliance.

##### Implementation
- New: `app/domain/leadgen/services/QuickCheckAssessor.js` — domain service, pure functions
- New: `app/application/leadgen/assessQuickCheck.js` — application use case
- New: `app/api/public/quick-check.js` — POST handler (public, no auth)
- Modified: `server/lib/schemas.js` — `QuickCheckSchema`

##### Acceptance Criteria
- [ ] `POST /api/public/quick-check` accepts `{usesAI, employeeCount, euPresence, domains, email, consent}`
- [ ] Public endpoint: no auth required
- [ ] Rate limited: 10 requests/IP/hour via @fastify/rate-limit
- [ ] Domain service calculates: `applies` (boolean), `obligationCount`, `highRiskAreas` (count), `literacyRequired` (boolean), `articles` (matched AI Act articles)
- [ ] Assessment logic: Art. 2 applicability check → Annex III domain check → obligation counting
- [ ] Email field optional for initial assessment, required for full result
- [ ] When email provided with consent: captures lead (stored for future Brevo integration)
- [ ] Returns structured result: `{applies, obligations, highRiskAreas, literacyRequired, articles, recommendations}`
- [ ] Zod validation on all input fields

- **Tests:** 6 (quick-check-assessor.test.js) + 6 (quick-check-api.test.js) = 12
- **Dependencies:** None

---

### Phase 3: Frontend — Pricing + Registration + Lead Gen (12 SP)

#### US-041: Registration Flow + Plan Selection (5 SP)

- **Feature:** 02 (Sprint 3.5 extension) | **Developer:** Nina

##### Description
As a user who selected a plan from the Pricing page, I want the registration flow to reflect my chosen plan and route me through the appropriate steps (free → dashboard, paid → Stripe Checkout), so that I get a seamless signup-to-trial experience.

##### Implementation
- Modified: `frontend/app/auth/register/page.tsx` — plan-aware registration with URL params
- New: `frontend/app/checkout/success/page.tsx` — checkout success page (Screen 22)
- New: `frontend/components/PlanBadge.tsx` — plan name + price display component
- New: `frontend/components/TrialConfirmation.tsx` — step 3 for paid plans

##### Acceptance Criteria
- [ ] Registration page reads `?plan=` and `?period=` from URL params
- [ ] Shows selected plan badge at top of registration form
- [ ] Free plan: 2-step flow (Account → Company → redirect to /dashboard)
- [ ] Paid plan: 3-step flow (Account → Company → Trial Confirmation → Stripe Checkout redirect)
- [ ] Step indicator shows correct number of steps (2 for free, 3 for paid)
- [ ] Trial Confirmation step shows: plan name, price, billing period, "14-day free trial", features included
- [ ] [Start 14-Day Trial] button calls `POST /api/billing/checkout` and redirects to Stripe
- [ ] Checkout Success page (`/checkout/success`): shows success icon, plan badge, trial details
- [ ] Success page polls `GET /api/billing/checkout-status` every 2s (max 10 attempts)
- [ ] Auto-redirects to `/dashboard` after confirmation
- [ ] Handles error states: already subscribed, Stripe errors, timeout
- [ ] Mobile responsive

- **Tests:** 3 (component tests)
- **Dependencies:** US-038, US-039

---

#### US-042: Pricing Page (3 SP)

- **Feature:** 09 (partial) | **Developer:** Nina

##### Description
As a visitor, I want to see a clear comparison of all pricing plans with monthly/annual toggle, so that I can choose the right plan for my company.

##### Implementation
- New: `frontend/app/pricing/page.tsx` — pricing page (Screen 19)
- New: `frontend/components/PricingToggle.tsx` — monthly/annual toggle
- New: `frontend/components/PricingCard.tsx` — plan card with features + CTA

##### Acceptance Criteria
- [ ] Displays 5 pricing tiers: Free, Starter, Growth (Most Popular badge), Scale, Enterprise
- [ ] Monthly/Annual toggle — default: Monthly. Annual shows discounted prices + "Save 20%" badge
- [ ] Feature comparison matrix with expandable rows
- [ ] CTA buttons link to plan-aware registration:
  - Free: [Get Started Free] → `/auth/register?plan=free`
  - Starter/Growth/Scale: [Start 14-Day Trial] → `/auth/register?plan={name}&period={monthly|annual}`
  - Enterprise: [Contact Sales →] → Calendly or email
- [ ] Period toggle updates CTA link params
- [ ] FAQ accordion section at bottom
- [ ] Mobile: pricing cards horizontal scroll, feature matrix as accordion
- [ ] Data sourced from `app/config/plans.js` (shared with backend)

- **Tests:** 2 (component tests)
- **Dependencies:** None

---

#### US-043: Quick Check Page (2 SP)

- **Feature:** 23 (partial) | **Developer:** Nina

##### Description
As a visitor, I want a simple 5-step questionnaire to check if the AI Act applies to my company, so that I can assess urgency before signing up.

##### Implementation
- New: `frontend/app/check/page.tsx` — Quick Check page (Screen 20)
- New: `frontend/components/QuickCheckWizard.tsx` — 5-step micro-wizard
- New: `frontend/components/QuickCheckResult.tsx` — result display

##### Acceptance Criteria
- [ ] Public page, no auth required
- [ ] 5-step micro-wizard with progress indicator (step dots)
- [ ] Step 1: "Does your company use AI tools?" (radio: Yes actively / Planning / Not sure / No)
- [ ] Step 2: "How many employees?" (radio: 1-10 / 11-50 / 51-200 / 200+)
- [ ] Step 3: "Do you have EU clients or EU operations?" (radio: Yes / No / Unsure)
- [ ] Step 4: "Do you use AI in any of these areas?" (multi-select: HR, Healthcare, Finance, Education, Law enforcement, None)
- [ ] Step 5: Email input + consent checkbox for personalized result
- [ ] Calls `POST /api/public/quick-check` on submission
- [ ] Result page shows: applicability verdict, obligation count, high-risk areas, key findings, article references
- [ ] CTAs: [Create Free Account →] → `/auth/register?plan=free`, [Start 14-Day Trial →] → `/auth/register?plan=growth&period=monthly`
- [ ] Mobile responsive, full-width buttons

- **Tests:** 2 (component tests)
- **Dependencies:** US-040

---

#### US-044: Penalty Calculator Page (2 SP)

- **Feature:** 23 (partial) | **Developer:** Nina

##### Description
As a visitor, I want to enter my company's annual revenue and see the maximum AI Act penalties, so that I understand the financial risk of non-compliance.

##### Implementation
- New: `frontend/app/penalty-calculator/page.tsx` — Penalty Calculator page (Screen 21)
- New: `frontend/components/PenaltyResult.tsx` — penalty display with 3 tiers

##### Acceptance Criteria
- [ ] Public page, no auth required
- [ ] Revenue input field (EUR) with formatting (thousands separator)
- [ ] [Calculate Maximum Fine] button — client-side calculation (no API call needed)
- [ ] Art. 99 formula: Prohibited = max(7% revenue, 35,000,000), High-risk = max(3% revenue, 15,000,000), Other = max(1.5% revenue, 7,500,000)
- [ ] Result shows 3 tiers with color coding: Prohibited (red), High-risk (orange), Other (yellow)
- [ ] Each tier: fine amount, formula explanation, article reference
- [ ] [Share Result] button (copies URL with `?revenue=X` param)
- [ ] [Create Account →] CTA → `/auth/register?plan=free`
- [ ] Pre-fills from URL param `?revenue=X` on page load
- [ ] Mobile responsive

- **Tests:** 2 (component tests)
- **Dependencies:** None

---

## Summary

| Phase | Stories | SP | Developer |
|-------|---------|-----|-----------|
| Backend: Stripe | US-038, US-039 | 8 | Max |
| Backend: Quick Check | US-040 | 2 | Max |
| Frontend: Registration + Plan | US-041 | 5 | Nina |
| Frontend: Pricing | US-042 | 3 | Nina |
| Frontend: Quick Check | US-043 | 2 | Nina |
| Frontend: Penalty Calculator | US-044 | 2 | Nina |
| **Total** | **7 stories** | **22 SP** | **2 devs** |

---

## New Files

### Backend (Max)
```
app/config/stripe.js
app/domain/billing/services/CheckoutSessionCreator.js
app/domain/leadgen/services/QuickCheckAssessor.js
app/application/billing/createCheckoutSession.js
app/application/billing/getCheckoutStatus.js
app/application/billing/handleStripeWebhook.js
app/application/leadgen/assessQuickCheck.js
app/api/billing/checkout.js
app/api/webhooks/stripe.js
app/api/public/quick-check.js
```

### Frontend (Nina)
```
frontend/app/auth/register/page.tsx (modified — plan-aware)
frontend/app/checkout/success/page.tsx
frontend/app/pricing/page.tsx
frontend/app/check/page.tsx
frontend/app/penalty-calculator/page.tsx
frontend/components/PlanBadge.tsx
frontend/components/TrialConfirmation.tsx
frontend/components/PricingToggle.tsx
frontend/components/PricingCard.tsx
frontend/components/QuickCheckWizard.tsx
frontend/components/QuickCheckResult.tsx
frontend/components/PenaltyResult.tsx
```

## Modified Files
```
server/lib/schemas.js — CheckoutCreateSchema, CheckoutStatusSchema, QuickCheckSchema
server/main.js — register billing + webhook + public routes
```

## New Test Files
```
tests/stripe-checkout.test.js        (7 tests)
tests/stripe-webhook.test.js         (8 tests)
tests/quick-check-assessor.test.js   (6 tests)
tests/quick-check-api.test.js        (6 tests)
+ frontend component tests           (9 tests)
Total: ~36 new tests (191 → ~227)
```

---

## Verification Checklist

- [ ] `npm run lint` — 0 errors
- [ ] `npm run type-check` — 0 errors
- [ ] `npm test` — ~227 tests, 0 failures
- [ ] Stripe Checkout: creates session with correct price ID and trial period
- [ ] Stripe Webhook: signature verification, subscription update, idempotency
- [ ] Quick Check: correct AI Act applicability assessment for all input combinations
- [ ] Plan-aware registration: free → dashboard, paid → Stripe → success → dashboard
- [ ] Pricing page: all CTAs link to correct registration URLs with plan/period params
- [ ] Penalty Calculator: correct Art. 99 formula for all 3 tiers
- [ ] Public endpoints: no auth required, rate limited
- [ ] Authenticated endpoints: Ory session + permission checks
- [ ] AuditLog on all billing mutations
- [ ] Zod validation on all new APIs
- [ ] Mobile responsive on all new pages
