# BillSDK SaaS Demo

A complete demo application showcasing BillSDK's billing capabilities with Next.js.

## Features Demonstrated

- **Pricing Page** - Display plans with monthly/yearly toggle
- **Stripe Checkout** - Secure payment flow
- **Dashboard** - View subscription status and features
- **Feature Gating** - Visual demo of enabled/locked features
- **Cancel Subscription** - Self-service cancellation flow

## Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL database
- Stripe account (test mode)

### 2. Setup

```bash
# Clone and install
cd examples/saas
pnpm install

# Copy environment variables
cp .env.example .env.local
```

### 3. Configure Environment

Edit `.env.local`:

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/billsdk_demo"

# Stripe (get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# BillSDK
BILLSDK_SECRET="your-secret-key-min-32-chars"
```

### 4. Setup Stripe Webhook

For local development, use [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Copy the webhook secret and add to `.env.local`.

### 5. Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Flow

1. **Start** → `/pricing`
2. **Select Plan** → Click "Get Started" or "Subscribe"
3. **Checkout** → Redirects to Stripe Checkout (use test card `4242 4242 4242 4242`)
4. **Success** → `/success` shows subscription details
5. **Dashboard** → `/dashboard` shows plan and features
6. **Features** → `/features` shows enabled/locked features
7. **Settings** → `/settings` to cancel subscription

## Project Structure

```
src/
├── app/
│   ├── api/billing/[...all]/route.ts  # BillSDK API handler
│   ├── pricing/page.tsx               # Pricing page
│   ├── success/page.tsx               # Post-checkout success
│   ├── dashboard/page.tsx             # Subscription dashboard
│   ├── features/page.tsx              # Feature gating demo
│   └── settings/page.tsx              # Billing settings
├── components/
│   ├── pricing-card.tsx               # Plan display card
│   ├── feature-gate.tsx               # Feature gating component
│   └── ui/                            # shadcn/ui components
└── lib/
    ├── billing.ts                     # BillSDK configuration
    ├── constants.ts                   # Demo user ID
    └── db/                            # Database setup
```

## BillSDK Configuration

See [src/lib/billing.ts](./src/lib/billing.ts) for the complete configuration:

```typescript
export const billing = billsdk({
  database: drizzleAdapter(db, { schema, provider: "pg" }),
  payment: stripePayment({
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  }),
  features: [
    { code: "export", name: "Export Data" },
    { code: "api_access", name: "API Access" },
    { code: "custom_domain", name: "Custom Domain" },
    { code: "priority_support", name: "Priority Support" },
  ],
  plans: [
    {
      code: "free",
      name: "Free",
      prices: [{ amount: 0, interval: "monthly" }],
      features: ["export"],
    },
    {
      code: "pro",
      name: "Pro",
      prices: [
        { amount: 2000, interval: "monthly" },
        { amount: 20000, interval: "yearly" },
      ],
      features: ["export", "api_access", "custom_domain", "priority_support"],
    },
  ],
});
```

## Test Cards

| Card | Scenario |
|------|----------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Declined |
| `4000 0000 0000 3220` | 3D Secure required |

Use any future expiry date and any CVC.

## Note

This demo uses a hardcoded user ID (`DEMO_USER_ID`) for simplicity. In a real application, you would:

1. Integrate with your authentication system
2. Create a billing customer when users sign up
3. Use the authenticated user's ID as `customerId`

## License

MIT
