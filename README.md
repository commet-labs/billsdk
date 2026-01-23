# BillSDK

> **The billing SDK for modern apps. Own your billing logic. Use any payment provider.**

BillSDK is a billing engine that runs inside your application. Define plans in code, integrate with Stripe (or any payment provider), and ship billing in minutes.

## Features

- **Plans & Features** - Define pricing in code, version-controlled
- **Boolean Features** - On/off feature gating per plan
- **Stripe Checkout** - Redirect to hosted payment page
- **Webhooks** - Automatic payment confirmation handling
- **Trial Periods** - Configurable trial days per plan
- **Type-Safe** - Full TypeScript support with inference

## Quick Start

### 1. Install

```bash
npm install billsdk @billsdk/stripe @billsdk/drizzle
```

### 2. Configure

```typescript
// lib/billing.ts
import { billsdk } from "billsdk";
import { drizzleAdapter } from "@billsdk/drizzle";
import { stripePayment } from "@billsdk/stripe";
import { db } from "./db";
import * as schema from "./db/schema";

export const billing = billsdk({
  database: drizzleAdapter(db, { schema, provider: "pg" }),
  
  payment: stripePayment({
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  }),

  features: [
    { code: "export", name: "Export Data" },
    { code: "api_access", name: "API Access" },
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
        { amount: 2000, interval: "monthly" },  // $20/mo
        { amount: 20000, interval: "yearly" },  // $200/yr
      ],
      features: ["export", "api_access"],
    },
  ],
});
```

### 3. Mount the API

```typescript
// app/api/billing/[...all]/route.ts (Next.js App Router)
import { billing } from "@/lib/billing";

export const GET = billing.handler;
export const POST = billing.handler;
```

### 4. Use the API

```typescript
// Create a customer
await billing.api.createCustomer({
  externalId: user.id,
  email: user.email,
});

// Create subscription → redirects to Stripe Checkout
const { checkoutUrl } = await billing.api.createSubscription({
  customerId: user.id,
  planCode: "pro",
  interval: "monthly",
  successUrl: "/success",
  cancelUrl: "/pricing",
});

// Check feature access
const { allowed } = await billing.api.checkFeature({
  customerId: user.id,
  feature: "api_access",  // Type-safe!
});

if (!allowed) {
  return "Upgrade to Pro for API access";
}

// Cancel subscription
await billing.api.cancelSubscription({
  customerId: user.id,
  cancelAt: "period_end",  // or "immediately"
});
```

## API Reference

### `billing.api`

| Method | Description |
|--------|-------------|
| `createCustomer(data)` | Create a new customer |
| `getCustomer({ externalId })` | Get customer by external ID |
| `listPlans()` | List all public plans |
| `getPlan({ code })` | Get a plan by code |
| `createSubscription(data)` | Create subscription and get checkout URL |
| `getSubscription({ customerId })` | Get active subscription |
| `cancelSubscription({ customerId, cancelAt })` | Cancel subscription |
| `checkFeature({ customerId, feature })` | Check feature access |
| `listFeatures({ customerId })` | List all features for customer |

### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `database` | `DBAdapter` | Database adapter (drizzle, memory) |
| `payment` | `PaymentAdapter` | Payment adapter (stripe) |
| `basePath` | `string` | API base path (default: `/api/billing`) |
| `secret` | `string` | Secret for signing (required in production) |
| `features` | `FeatureConfig[]` | Feature definitions |
| `plans` | `PlanConfig[]` | Plan definitions |
| `plugins` | `Plugin[]` | Plugins (future) |
| `hooks` | `{ before?, after? }` | Request hooks |
| `logger` | `{ level, disabled }` | Logger config |

## Packages

| Package | Description |
|---------|-------------|
| `billsdk` | Main package (re-exports core) |
| `@billsdk/core` | Core billing engine |
| `@billsdk/drizzle` | Drizzle ORM adapter |
| `@billsdk/stripe` | Stripe payment adapter |

## Examples

See the [examples/saas](./examples/saas) directory for a complete Next.js demo.

```bash
cd examples/saas
cp .env.example .env.local
# Add your Stripe keys
pnpm install
pnpm dev
```

## Why BillSDK?

| | Stripe Billing | Chargebee | BillSDK |
|---|---------------|-----------|---------|
| **Type** | SaaS | SaaS | Embedded SDK |
| **Runs in** | Their servers | Their servers | Your app |
| **Lock-in** | High | High | None |
| **Pricing** | % of revenue | $$$/mo | Free (OSS) |
| **Customization** | Limited | Medium | Full control |

## Roadmap

| Phase | Features | Status |
|-------|----------|--------|
| **MVP** | Fixed-price plans, boolean features, Stripe | ✅ Done |
| **v0.2** | Metered usage, usage tracking | Planned |
| **v0.3** | Seats (per-user licensing) | Planned |
| **v0.4** | Credits & Balance | Planned |
| **v0.5** | Proration, plan changes | Planned |

## License

MIT
