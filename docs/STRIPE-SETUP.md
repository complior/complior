# Stripe Test Mode Setup Guide

This guide walks through configuring Stripe in test mode for the Complior checkout flow.

## 1. Create a Stripe Account

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/register) and create an account.
2. After signup, ensure **Test mode** is toggled ON (top-right toggle in the dashboard).

## 2. Get API Keys

1. Navigate to **Developers > API keys** in the Stripe Dashboard.
2. Copy the **Publishable key** (`pk_test_...`) — used in frontend (not currently needed).
3. Copy the **Secret key** (`sk_test_...`) — used in backend.
4. Add to your `.env`:

```
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
```

## 3. Create Products and Prices

Create 3 products in **Products > Add product**:

### Starter Plan
- **Name**: Starter
- **Price 1**: $49.00/month (recurring, monthly)
- **Price 2**: $39.20/month (recurring, yearly — billed $470.40/year)

### Growth Plan
- **Name**: Growth
- **Price 1**: $149.00/month (recurring, monthly)
- **Price 2**: $119.20/month (recurring, yearly — billed $1,430.40/year)

### Scale Plan
- **Name**: Scale
- **Price 1**: $399.00/month (recurring, monthly)
- **Price 2**: $319.20/month (recurring, yearly — billed $3,830.40/year)

After creating, copy each Price ID (`price_...`) from the dashboard and set them in your `.env`:

```
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_GROWTH_MONTHLY=price_...
STRIPE_PRICE_GROWTH_YEARLY=price_...
STRIPE_PRICE_SCALE_MONTHLY=price_...
STRIPE_PRICE_SCALE_YEARLY=price_...
```

See `.env.stripe.example` for the full template.

## 4. Configure Webhooks

### Local Development

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
# Download from https://github.com/stripe/stripe-cli/releases

# Login
stripe login
```

Forward webhook events to your local server:

```bash
stripe listen --forward-to localhost:8000/api/webhooks/stripe
```

The CLI will output a webhook signing secret (`whsec_...`). Add it to your `.env`:

```
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

### Production

1. Go to **Developers > Webhooks > Add endpoint**.
2. Set URL: `https://app.complior.eu/api/webhooks/stripe`
3. Select events (see Section 6 below).
4. Copy the signing secret to your production `.env`.

## 5. Webhook Events Handled

The application handles these Stripe events:

| Event | Handler | Description |
|-------|---------|-------------|
| `checkout.session.completed` | Updates subscription to `trialing`, stores Stripe IDs | Fired when customer completes checkout |
| `invoice.paid` | Updates subscription to `active`, extends period | Fired on successful payment |
| `invoice.payment_failed` | Updates subscription to `past_due` | Fired when payment fails |
| `customer.subscription.deleted` | Updates subscription to `canceled` | Fired when subscription is canceled |

When adding the webhook endpoint (local or production), select these 4 events.

## 6. Test Card Numbers

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 3220` | 3D Secure authentication required |

Use any future expiry date (e.g., `12/34`), any 3-digit CVC, and any ZIP code.

## 7. Full Checkout Flow Walkthrough

1. **Start**: User visits `/pricing` and selects a paid plan (Starter, Growth, or Scale).
2. **Register**: User is redirected to `/auth/register?plan=starter&period=monthly`.
3. **Account creation**: User completes 3-step registration (account, company, trial confirmation).
4. **Stripe redirect**: On Step 3, clicking "Start Trial" calls `POST /api/billing/checkout` which creates a Stripe Checkout Session with a 14-day trial, then redirects to Stripe's hosted checkout page.
5. **Payment**: User enters card details on Stripe's page. Use test card `4242 4242 4242 4242`.
6. **Success**: Stripe redirects to `/checkout/success?session_id={CHECKOUT_SESSION_ID}`. The page polls for payment confirmation.
7. **Webhook**: Stripe fires `checkout.session.completed`. Our webhook handler updates the organization's subscription record in the database.
8. **Dashboard**: User is redirected to `/dashboard` with their new plan active.

### Cancel flow
If the user cancels on Stripe's checkout page, they are redirected to `/checkout/cancel` with options to retry or browse plans.

## 8. Code Architecture

| File | Purpose |
|------|---------|
| `app/config/stripe.js` | Reads Stripe env vars (secret key, webhook secret, 6 price IDs) |
| `server/infrastructure/billing/stripe-client.js` | Stripe SDK wrapper (createCheckoutSession, retrieveSession, constructEvent) |
| `app/application/billing/createCheckoutSession.js` | Business logic: resolves price ID from plan+period, creates Stripe session with 14-day trial |
| `app/application/billing/handleStripeWebhook.js` | Event handler: routes events to handlers, updates DB in transactions |
| `app/api/billing/checkout.js` | POST endpoint: auth + validation, calls createCheckoutSession |
| `app/api/billing/checkoutStatus.js` | GET endpoint: polls Stripe session status for frontend |
| `app/api/webhooks/stripe.js` | POST endpoint (public): verifies Stripe signature, delegates to handleStripeWebhook |

## 9. Environment Variables Checklist

Copy `.env.stripe.example` to your `.env` and fill in:

- [ ] `STRIPE_SECRET_KEY` — from Stripe Dashboard > Developers > API keys
- [ ] `STRIPE_WEBHOOK_SECRET` — from `stripe listen` (dev) or Dashboard > Webhooks (prod)
- [ ] `STRIPE_PRICE_STARTER_MONTHLY` — Price ID from Stripe Dashboard
- [ ] `STRIPE_PRICE_STARTER_YEARLY` — Price ID from Stripe Dashboard
- [ ] `STRIPE_PRICE_GROWTH_MONTHLY` — Price ID from Stripe Dashboard
- [ ] `STRIPE_PRICE_GROWTH_YEARLY` — Price ID from Stripe Dashboard
- [ ] `STRIPE_PRICE_SCALE_MONTHLY` — Price ID from Stripe Dashboard
- [ ] `STRIPE_PRICE_SCALE_YEARLY` — Price ID from Stripe Dashboard
- [ ] `PLATFORM_ADMIN_EMAILS` — comma-separated admin emails

## 10. Production Domain Migration Checklist

When moving from Cloudflare tunnel / test mode to real domain `app.complior.eu`:

### Stripe: Test → Live

- [ ] Toggle **Live mode** in Stripe Dashboard (top-right switch)
- [ ] Copy **Live API keys** (`sk_live_...`, `pk_live_...`) — replace test keys in `.env.production`
- [ ] Re-create all 3 Products and 6 Prices in Live mode (they don't carry over from Test)
- [ ] Update all `STRIPE_PRICE_*` env vars with Live Price IDs
- [ ] Create a **Live webhook endpoint** in Dashboard > Webhooks:
  - URL: `https://app.complior.eu/api/webhooks/stripe`
  - Events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`
- [ ] Copy the Live webhook signing secret → `STRIPE_WEBHOOK_SECRET` in `.env.production`
- [ ] Remove `stripe listen` CLI (only for dev)

### Application URLs

- [ ] `.env.production`: `FRONTEND_URL=https://app.complior.eu`
- [ ] `.env.production`: `CORS_ORIGIN=https://app.complior.eu`
- [ ] `ory/kratos.production.yml`: update `serve.public.base_url` to `https://app.complior.eu/.ory`
- [ ] `ory/kratos.production.yml`: update `selfservice.default_browser_return_url` to `https://app.complior.eu`
- [ ] `ory/kratos.production.yml`: update `cookies.domain` to `app.complior.eu`
- [ ] `ory/kratos.production.yml`: update `session.cookie.domain` to `app.complior.eu`
- [ ] `caddy/Caddyfile`: set domain to `app.complior.eu` (Caddy handles auto-TLS)

### Docker Compose

- [ ] `docker-compose.production.yml`: Kratos command → `kratos.production.yml` (remove `--dev`)
- [ ] `docker-compose.production.yml`: remove exposed ports for backend (8000) and Kratos (4433/4434)
- [ ] Rebuild all: `docker compose -f docker-compose.production.yml build`
- [ ] Deploy: `docker compose -f docker-compose.production.yml up -d`

### DNS

- [ ] Point `app.complior.eu` A record to Hetzner server IP
- [ ] Wait for DNS propagation + Caddy auto-TLS certificate

### Verification

- [ ] `https://app.complior.eu/` loads landing page
- [ ] `https://app.complior.eu/en/pricing` → Get Started → full registration flow
- [ ] Stripe checkout uses **Live mode** (no "TEST MODE" banner)
- [ ] Webhook receives events (check Stripe Dashboard > Webhooks > Logs)
- [ ] Admin panel at `https://app.complior.eu/en/admin/dashboard` shows data
