# BillSDK Vision

> **The billing SDK for modern apps. Own your billing logic. Use any payment provider.**

## Packages

- `billsdk` - Main package (re-exports @billsdk/core)
- `@billsdk/core` - Core billing engine
- `@billsdk/drizzle` - Drizzle ORM adapter
- `@billsdk/stripe` - Stripe payment adapter

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

| Feature | Description |
|---------|-------------|
| **Subscriptions** | Full lifecycle: draft → trial → active → paused → canceled |
| **Plans** | Pricing packages with base price + configured features |
| **Features** | Boolean (on/off), Metered (usage-based), Seats (per-user) |
| **Usage Tracking** | Report and track consumption for metered billing |
| **Seats** | Per-user licensing with seat types (admin, member, viewer) |
| **Credits & Balance** | Prepaid models, credit packs, consumption blocking |
| **Billing Calculation** | Calculate what to charge (base + usage + seats + proration) |
| **Payments** | Record charges with breakdown, handle via payment adapter |
| **Proration** | Correct calculations for upgrades/downgrades mid-cycle |
| **Trials** | Configurable trial periods with automatic conversion |
| **Discounts** | Percentage or fixed discounts, introductory offers |

### Core vs Plugins

```
BillSDK Core (essential):
├── Subscriptions
├── Plans & Features
├── Usage tracking
├── Seats
├── Credits & Balance
├── Billing calculation (what to charge)
├── Payments table (record of charges)
└── Payment adapters (execute charges)

Plugins (optional):
├── @billsdk/invoices    → Legal invoices with line items, PDF generation
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
import { billsdk } from "billsdk";
import { drizzleAdapter } from "billsdk/adapters/drizzle";
import { stripePayment } from "@billsdk/stripe";
import { db } from "./db";

export const billing = billsdk({
  // Your database - BillSDK owns the tables
  database: drizzleAdapter(db),
  
  // Payment provider - only for charging
  payment: stripePayment({
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  }),
  
  // Define your plans (or load from DB)
  plans: [
    {
      code: "free",
      name: "Free",
      prices: [{ interval: "monthly", amount: 0 }],
      features: {
        api_calls: { type: "metered", included: 1000 },
        seats: { type: "seats", included: 1 },
        custom_domain: { type: "boolean", enabled: false },
      },
    },
    {
      code: "pro",
      name: "Pro",
      prices: [
        { interval: "monthly", amount: 2900 },  // $29/mo
        { interval: "yearly", amount: 29000 },  // $290/yr (2 months free)
      ],
      features: {
        api_calls: { type: "metered", included: 50000, overage: 1 }, // $0.01/extra
        seats: { type: "seats", included: 5, overagePrice: 1000 },   // $10/extra seat
        custom_domain: { type: "boolean", enabled: true },
      },
      trial: { days: 14 },
    },
  ],
});

// API handler - works with any framework
export const billingHandler = billing.handler;
```

### Framework Integration

```typescript
// Next.js
// app/api/billing/[...path]/route.ts
import { billing } from "@/lib/billing";

export const { GET, POST } = billing.handlers;

// Webhook endpoint
// app/api/billing/webhook/route.ts
export const POST = billing.webhookHandler;
```

### Server-Side API

```typescript
// Create a customer when user signs up
const customer = await billing.customers.create({
  externalId: user.id,  // Your user ID
  email: user.email,
  name: user.name,
});

// Subscribe to a plan
const { subscription, checkoutUrl } = await billing.subscriptions.create({
  customerId: customer.id,
  planCode: "pro",
  interval: "monthly",
  successUrl: "/dashboard",
  cancelUrl: "/pricing",
});

// User clicks checkoutUrl → pays → webhook confirms → subscription active

// Check feature access
const canUseCustomDomain = await billing.features.check({
  customerId: customer.id,
  feature: "custom_domain",
});
// → { allowed: true }

// Report usage
await billing.usage.report({
  customerId: customer.id,
  feature: "api_calls",
  quantity: 1,
});

// Check usage
const usage = await billing.usage.get({
  customerId: customer.id,
  feature: "api_calls",
});
// → { used: 1523, included: 50000, remaining: 48477, overage: 0 }

// Add a seat
await billing.seats.add({
  customerId: customer.id,
  seatType: "member",
  userId: "user_456",
});

// Upgrade plan (with proration)
const { invoice, checkoutUrl } = await billing.subscriptions.changePlan({
  subscriptionId: subscription.id,
  newPlanCode: "enterprise",
  prorate: true,  // Calculate mid-cycle credit
});

// Cancel subscription
await billing.subscriptions.cancel({
  subscriptionId: subscription.id,
  cancelAt: "period_end",  // or "immediately"
});
```

### Client SDK

```typescript
// React
import { BillingProvider, useBilling } from "billsdk/react";

function App() {
  return (
    <BillingProvider baseUrl="/api/billing" customerId={user.id}>
      <Dashboard />
    </BillingProvider>
  );
}

function Dashboard() {
  const { subscription, usage, plans } = useBilling();
  
  if (subscription.isLoading) return <Spinner />;
  
  return (
    <div>
      <p>Plan: {subscription.data?.plan.name}</p>
      <p>API Calls: {usage.data?.api_calls.used} / {usage.data?.api_calls.included}</p>
      
      <button onClick={() => billing.portal.open()}>
        Manage Billing
      </button>
    </div>
  );
}
```

```typescript
// Vanilla JS
import { createBillingClient } from "billsdk/client";

const billing = createBillingClient({
  baseUrl: "/api/billing",
});

// Reactive atoms
billing.$subscription.subscribe((sub) => {
  console.log("Subscription changed:", sub);
});

billing.$usage.subscribe((usage) => {
  updateUsageBar(usage.api_calls);
});

// Initialize with customer
billing.setCustomerId("cus_123");

// Upgrade
await billing.subscriptions.upgrade({ planCode: "pro" });
```

### Billing Processor (Cron)

```typescript
// Your cron job (daily recommended)
import { billing } from "@/lib/billing";

// This processes all subscriptions that need action:
// - Generate invoices for renewals
// - Charge customers
// - Handle failed payments
// - Convert trials
// - Process cancellations
const result = await billing.process();

console.log(result);
// {
//   processed: 150,
//   invoicesGenerated: 45,
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

### Database Schema (owned by BillSDK)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  customer   │────▶│subscription │────▶│   payment   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   
       │                   ▼                   
       │            ┌─────────────┐     
       │            │    plan     │     
       │            └─────────────┘     
       │                   │
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│usage_event  │     │plan_feature │
└─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│    seat     │     │   feature   │
└─────────────┘     └─────────────┘
```

### Core Tables

| Table | Purpose |
|-------|---------|
| `customer` | Your users, linked by externalId |
| `plan` | Pricing packages |
| `plan_price` | Prices per interval (monthly, yearly) |
| `feature` | Capabilities (api_calls, seats, custom_domain) |
| `plan_feature` | Feature config per plan (limits, overage) |
| `subscription` | Customer-plan relationship |
| `payment` | Charge records with breakdown (JSON) |
| `usage_event` | Raw usage data |
| `seat` | Per-user licenses |
| `credit_transaction` | Credit purchases and usage |

### Plugin Tables (optional)

| Plugin | Tables |
|--------|--------|
| `@billsdk/invoices` | `invoice`, `invoice_line` |
| `@billsdk/analytics` | `metric_snapshot` |
| `@billsdk/webhooks` | `webhook_event`, `webhook_delivery` |

### Plugin System

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

**Q: How is this different from Commet SaaS?**

Commet SaaS is a Merchant of Record - we handle taxes, compliance, refunds, payouts. You send us events, we handle everything.

BillSDK is self-hosted billing logic. You own the data, you handle payments directly, you're responsible for taxes.

**Q: Should I use BillSDK or Commet?**

- Use **BillSDK** if: You want full control, already have payment processing, want to avoid revenue share
- Use **Commet** if: You want hands-off billing, need MoR, don't want to handle taxes/compliance

**Q: What about Stripe Billing?**

Stripe Billing locks you into Stripe. BillSDK lets you use Stripe for payments while owning your billing logic. Tomorrow you can switch to Paddle without rewriting anything.

**Q: Do I need to run a cron job?**

Yes. BillSDK doesn't run background jobs. You call `billing.process()` from your cron (daily recommended). This is intentional - you have full control over when billing runs.

---

*This document represents our vision for BillSDK. Implementation details may evolve, but the core philosophy remains: own your billing logic, use any payment provider.*
