# BillSDK Vision

> **The billing SDK for modern apps. Own your billing logic. Use any payment provider.**

## Packages

- `billsdk` - Main package (re-exports @billsdk/core)
- `@billsdk/core` - Core billing engine
- `@billsdk/drizzle` - Drizzle ORM adapter
- `@billsdk/stripe` - Stripe payment adapter

## Roadmap

| Phase | Features | Status |
|-------|----------|--------|
| **MVP** | Fixed-price plans, boolean features, Stripe Checkout | ✅ Done |
| **v0.2** | Metered usage, usage tracking | 🔜 Next |
| **v0.3** | Seats (per-user licensing) | Planned |
| **v0.4** | Credits & Balance, prepaid models | Planned |
| **v0.5** | Proration, plan changes mid-cycle | Planned |
| **v1.0** | Stable API, multiple payment adapters | Planned |

## The Problem

Building billing is hard. Really hard.

Today, developers have two options:

1. **Use a billing SaaS** (Stripe Billing, Chargebee, Recurly)
   - Vendor lock-in
   - Expensive (% of revenue)
   - Limited customization
   - Your billing logic lives in someone else's servers

2. **Build it yourself**
   - Months of work
   - Edge cases everywhere (proration, trials, usage, failures)
   - Everyone reinvents the wheel
   - Bugs = lost revenue or angry customers

**There's no middle ground.** No "Better Auth for billing".

Until now.

---

## The Vision

**BillSDK is a billing engine that runs inside your application.**

```
┌─────────────────────────────────────────────────────────────┐
│                      Your Application                        │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                      BillSDK                         │   │
│   │                                                      │   │
│   │  Subscriptions · Plans · Features · Usage · Seats    │   │
│   │  Payments · Credits · Balance · Proration · Trials   │   │
│   │                                                      │   │
│   └─────────────────────┬───────────────────────────────┘   │
│                         │                                    │
│              ┌──────────┴──────────┐                        │
│              │   Payment Adapter    │                        │
│              └──────────┬──────────┘                        │
│                         │                                    │
└─────────────────────────┼────────────────────────────────────┘
                          │
            ┌─────────────┼─────────────┐
            │             │             │
         Stripe        Paddle      MercadoPago
        (or any payment provider)
```

**BillSDK handles 100% of billing logic. Payment providers only move money.**

---

## What BillSDK Does

### Core Billing Logic

| Feature | Description | Status |
|---------|-------------|--------|
| **Subscriptions** | Lifecycle: pending → trialing → active → canceled | ✅ MVP |
| **Plans** | Pricing packages defined in code | ✅ MVP |
| **Boolean Features** | On/off access control per plan | ✅ MVP |
| **Stripe Checkout** | Redirect to hosted payment page | ✅ MVP |
| **Webhooks** | Handle payment confirmation from Stripe | ✅ MVP |
| **Trials** | Configurable trial periods | ✅ MVP |
| **Metered Features** | Usage-based billing | 🔜 v0.2 |
| **Usage Tracking** | Report and track consumption | 🔜 v0.2 |
| **Seats** | Per-user licensing | 🔜 v0.3 |
| **Credits & Balance** | Prepaid models, credit packs | 🔜 v0.4 |
| **Proration** | Mid-cycle upgrade/downgrade calculations | 🔜 v0.5 |
| **Discounts** | Percentage or fixed discounts | 🔜 v0.5 |

### Core vs Plugins

```
BillSDK Core:
├── MVP (now)
│   ├── Customers
│   ├── Subscriptions
│   ├── Plans & Boolean Features (from config)
│   ├── Stripe Checkout integration
│   └── Webhook handling
│
├── Future (v0.2+)
│   ├── Metered usage tracking
│   ├── Seats management
│   ├── Credits & Balance
│   ├── Proration
│   └── Multiple payment adapters

Plugins (optional, future):
├── @billsdk/invoices    → Legal invoices with PDF
├── @billsdk/analytics   → MRR, churn, LTV metrics
├── @billsdk/webhooks    → Send events to external systems
└── @billsdk/portal      → Pre-built customer portal UI
```

### Payment vs Invoice

The core stores **payments** (technical records), not **invoices** (commercial documents).

| `payment` (core) | `invoice` (plugin) |
|------------------|-------------------|
| Technical record | Commercial document |
| For your system | For your customer |
| JSON breakdown | Detailed line items |
| No legal number | Invoice number |
| No PDF | Generates PDF |

```typescript
// Core payment record example:
{
  id: "pay_123",
  subscriptionId: "sub_456",
  amount: 4050,           // cents
  currency: "usd",
  status: "succeeded",
  providerPaymentId: "pi_xxx",  // Stripe PaymentIntent
  breakdown: {
    base: 2900,
    usage: 150,
    seats: 1000,
    proration: 0,
  },
  periodStart: "2024-01-01",
  periodEnd: "2024-01-31",
  paidAt: "2024-01-01T00:00:00Z",
}

// With invoices plugin, you also get:
{
  id: "inv_789",
  paymentId: "pay_123",
  number: "INV-2024-0001",
  lines: [
    { description: "Pro Plan (Jan 2024)", amount: 2900 },
    { description: "API calls overage (1,500 calls)", amount: 150 },
    { description: "Additional seat (1)", amount: 1000 },
  ],
  pdfUrl: "/invoices/inv_789.pdf",
}
```

### What Payment Adapters Do

| Adapter | Responsibility |
|---------|----------------|
| `stripeAdapter` | Create PaymentIntent, handle webhook, refunds |
| `paddleAdapter` | Same, different API |
| `mercadopagoAdapter` | Same, different API |
| `manualAdapter` | For bank transfers, manual payments |

**Payment adapters are thin.** They only:
1. Create a payment request (amount, currency, customer)
2. Report back: success or failure
3. Handle refunds

**That's it.** No subscription logic, no invoice generation, no proration.

---

## Developer Experience (The End State)

### Installation

```bash
npm install billsdk
npm install @billsdk/stripe  # or @billsdk/paddle, etc.
```

### Server Setup

```typescript
// lib/billing.ts
import { billsdk } from "billsdk";
import { drizzleAdapter } from "@billsdk/drizzle";
import { stripePayment } from "@billsdk/stripe";
import { db } from "./db";
import * as schema from "./db/schema";

export const billing = billsdk({
  // Database adapter - only stores customers & subscriptions
  database: drizzleAdapter(db, { schema, provider: "pg" }),
  
  // Payment adapter - handles checkout & webhooks
  payment: stripePayment({
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  }),

  // API base path
  basePath: "/api/billing",
  
  // Features are defined in code (source of truth)
  features: [
    { code: "export", name: "Export Data" },
    { code: "api_access", name: "API Access" },
    { code: "priority_support", name: "Priority Support" },
  ],
  
  // Plans are defined in code (source of truth)
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
        { amount: 2000, interval: "monthly" },   // $20/mo
        { amount: 20000, interval: "yearly" },   // $200/yr
      ],
      features: ["export", "api_access"],
    },
    {
      code: "enterprise",
      name: "Enterprise",
      isPublic: false,  // Hidden from pricing page
      prices: [
        { amount: 9900, interval: "monthly" },
        { amount: 99000, interval: "yearly" },
      ],
      features: ["export", "api_access", "priority_support"],
    },
  ],
});
```

### Framework Integration

```typescript
// Next.js App Router
// app/api/billing/[...all]/route.ts
import { billing } from "@/lib/billing";

export const GET = billing.handler;
export const POST = billing.handler;
```

### Server-Side API (MVP)

```typescript
// Create a customer when user signs up
const customer = await billing.api.createCustomer({
  externalId: user.id,  // Your user ID
  email: user.email,
  name: user.name,
});

// Create subscription (redirects to Stripe Checkout)
const { checkoutUrl } = await billing.api.createSubscription({
  customerId: user.id,    // externalId
  planCode: "pro",
  interval: "monthly",
  successUrl: "/success",
  cancelUrl: "/pricing",
});

// User clicks checkoutUrl → pays → webhook confirms → subscription active

// Check feature access
const { allowed } = await billing.api.checkFeature({
  customerId: user.id,
  feature: "api_access",
});

if (!allowed) {
  return "Upgrade to Pro for API access";
}

// Get subscription status
const subscription = await billing.api.getSubscription({
  customerId: user.id,
});
// → { status: "active", planCode: "pro", currentPeriodEnd: ... }

// List available plans
const plans = await billing.api.listPlans();
// → [{ code: "free", name: "Free", prices: [...] }, ...]
```

### Server-Side API (Future - v0.2+)

```typescript
// Report usage (metered features)
await billing.api.reportUsage({
  customerId: user.id,
  feature: "api_calls",
  quantity: 1,
});

// Check usage
const usage = await billing.api.getUsage({
  customerId: user.id,
  feature: "api_calls",
});
// → { used: 1523, included: 50000, remaining: 48477, overage: 0 }

// Add a seat
await billing.api.addSeat({
  customerId: user.id,
  seatType: "member",
  userId: "user_456",
});

// Change plan (with proration)
await billing.api.changePlan({
  customerId: user.id,
  newPlanCode: "enterprise",
  prorate: true,
});

// Cancel subscription
await billing.api.cancelSubscription({
  customerId: user.id,
  cancelAt: "period_end",  // or "immediately"
});
```

### Client SDK (MVP)

```typescript
// Vanilla JS - reactive state management
import { createBillingClient } from "billsdk/client";

const client = createBillingClient({
  baseUrl: "/api/billing",
});

// Reactive atoms
client.$subscription.subscribe((sub) => {
  console.log("Subscription:", sub);
  updateUI(sub);
});

// Initialize with customer
client.setCustomerId("user_123");

// Fetch current subscription
await client.subscription.fetch();
```

### Client SDK (Future - React bindings)

```typescript
// React (future)
import { BillingProvider, useSubscription } from "billsdk/react";

function App() {
  return (
    <BillingProvider baseUrl="/api/billing" customerId={user.id}>
      <Dashboard />
    </BillingProvider>
  );
}

function Dashboard() {
  const { data: subscription, isLoading } = useSubscription();
  
  if (isLoading) return <Spinner />;
  
  return (
    <div>
      <p>Plan: {subscription?.planCode}</p>
      <p>Status: {subscription?.status}</p>
    </div>
  );
}
```

### Billing Processor (Future - Cron)

```typescript
// Your cron job (for renewals, metered billing)
import { billing } from "@/lib/billing";

// Process all subscriptions that need action
const result = await billing.process();

console.log(result);
// {
//   processed: 150,
//   paymentsSuccessful: 43,
//   paymentsFailed: 2,
//   trialsConverted: 5,
//   subscriptionsCanceled: 3,
// }
```

---

## What BillSDK Does NOT Do (in core)

| Not in Core | Why | Alternative |
|-------------|-----|-------------|
| **Invoices** | Commercial documents, legal requirements vary | `@billsdk/invoices` plugin |
| **Tax calculation** | Complex, jurisdiction-specific | Stripe Tax, TaxJar, or plugin |
| **Merchant of Record** | That's a service, not a library | Commet SaaS |
| **Payment UI** | Provider-specific | Redirect to Stripe Checkout, etc. |
| **PDF generation** | Heavy dependency | `@billsdk/invoices` plugin |
| **Analytics** | Not core billing logic | `@billsdk/analytics` plugin |
| **Multi-currency** | Adds complexity | v2 or plugin |

**BillSDK core is lean.** It does billing calculation and payment recording.

Everything else is a plugin or external service.

**For full MoR** (taxes, compliance, payouts) → use **Commet SaaS**
**For self-hosted billing logic** → use **BillSDK**

---

## Architecture

### Config as Source of Truth

**Plans and features are defined in code, not in the database.**

This is intentional:
- **Immutable pricing** - Prices don't change for existing subscriptions
- **Version control** - Your pricing is in git, not a database
- **No sync issues** - No need to migrate data when changing plans
- **Simple** - Less tables, less complexity

```
┌─────────────────────────────────────────────────────────┐
│                    Your Code (config)                    │
│                                                          │
│   plans: [{ code: "pro", prices: [...], features: [...] }]
│   features: [{ code: "export", name: "Export" }]         │
│                                                          │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Database (state)                      │
│                                                          │
│   ┌─────────────┐         ┌─────────────┐               │
│   │  customer   │────────▶│subscription │               │
│   │             │         │             │               │
│   │ externalId  │         │ planCode    │               │
│   │ email       │         │ interval    │               │
│   │ provider... │         │ status      │               │
│   └─────────────┘         └─────────────┘               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Database Tables (MVP)

| Table | Purpose |
|-------|---------|
| `customer` | Your users, linked by externalId |
| `subscription` | Customer-plan relationship (references planCode) |

### Future Tables (v0.2+)

| Table | Purpose |
|-------|---------|
| `usage_event` | Raw usage data for metered features |
| `seat` | Per-user licenses |
| `credit_transaction` | Credit purchases and usage |
| `payment` | Charge records with breakdown |

### Plugin Tables (future)

| Plugin | Tables |
|--------|--------|
| `@billsdk/invoices` | `invoice`, `invoice_line` |
| `@billsdk/analytics` | `metric_snapshot` |
| `@billsdk/webhooks` | `webhook_event`, `webhook_delivery` |

### Plugin System (future)

```typescript
import { billsdk } from "billsdk";
import { invoicesPlugin } from "@billsdk/invoices";
import { analyticsPlugin } from "@billsdk/analytics";
import { webhooksPlugin } from "@billsdk/webhooks";

const billing = billsdk({
  // ...
  plugins: [
    // Generate legal invoices with PDF
    invoicesPlugin({
      numberFormat: "INV-{YEAR}-{SEQ}",
      companyInfo: {
        name: "Acme Inc",
        address: "123 Main St",
      },
    }),
    
    // Track MRR, churn, LTV
    analyticsPlugin(),
    
    // Send events to your systems
    webhooksPlugin({
      endpoints: ["https://your-app.com/billing-events"],
      events: ["payment.succeeded", "subscription.canceled"],
    }),
  ],
});

// Without invoices plugin:
await billing.process();
// → Creates payment records with breakdown

// With invoices plugin:
await billing.process();
// → Creates payment records AND invoice documents
```

---

## Comparison

| Feature | Stripe Billing | Chargebee | Lago | **BillSDK** |
|---------|---------------|-----------|------|-------------|
| **Type** | SaaS | SaaS | Self-hosted service | **Embedded SDK** |
| **Runs in** | Stripe's servers | Their servers | Docker container | **Your app** |
| **Payment providers** | Stripe only | Multiple | Multiple | **Any (adapter)** |
| **Lock-in** | High | High | Medium | **None** |
| **Pricing** | % of revenue | $$$/mo | Free (OSS) | **Free (OSS)** |
| **Customization** | Limited | Medium | High | **Full control** |
| **Latency** | API calls | API calls | API calls | **In-process** |

---

## The Goal

> **When someone asks "what should I use for billing?", the answer is BillSDK.**

Just like Better Auth became the answer for authentication.

---

## FAQ

**Q: What can I do with BillSDK today (MVP)?**

- Define plans with fixed prices in code
- Boolean features (on/off access)
- Stripe Checkout for payments
- Webhook handling for payment confirmation
- Check feature access per customer
- Trial periods

**Q: How is this different from Commet SaaS?**

Commet SaaS is a Merchant of Record - we handle taxes, compliance, refunds, payouts. You send us events, we handle everything.

BillSDK is self-hosted billing logic. You own the data, you handle payments directly, you're responsible for taxes.

**Q: Should I use BillSDK or Commet?**

- Use **BillSDK** if: You want full control, already have payment processing, want to avoid revenue share
- Use **Commet** if: You want hands-off billing, need MoR, don't want to handle taxes/compliance

**Q: What about Stripe Billing?**

Stripe Billing locks you into Stripe. BillSDK lets you use Stripe for payments while owning your billing logic. Tomorrow you can switch to Paddle without rewriting anything.

**Q: Why are plans defined in code, not the database?**

This is intentional:
- **Immutability** - Existing subscriptions keep their original price
- **Version control** - Your pricing is in git
- **Simplicity** - No sync between code and DB
- **Performance** - Plans are in memory, no DB queries

**Q: Do I need to run a cron job?**

Not for MVP. Stripe handles recurring billing via webhooks.

For metered billing (v0.2+), you'll need a cron to calculate usage and trigger charges.

---

*This document represents our vision for BillSDK. Implementation details may evolve, but the core philosophy remains: own your billing logic, use any payment provider.*
