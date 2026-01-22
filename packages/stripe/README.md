# @billsdk/stripe

Stripe payment adapter for BillSDK.

## Installation

```bash
pnpm add @billsdk/stripe stripe
```

## Usage

```typescript
import { billsdk } from "billsdk";
import { drizzleAdapter } from "@billsdk/drizzle";
import { stripePayment } from "@billsdk/stripe";

export const billing = billsdk({
  database: drizzleAdapter(db, { schema, provider: "pg" }),
  payment: stripePayment({
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  }),
});
```

## Configuration

```typescript
interface StripePaymentOptions {
  // Stripe secret key
  secretKey: string;
  
  // Webhook secret for signature verification
  webhookSecret: string;
  
  // API version (optional)
  apiVersion?: string;
}
```

## Webhook Setup

Configure your Stripe webhook to point to your BillSDK webhook endpoint:

```
https://your-app.com/api/billing/webhook
```

### Events Handled

- `checkout.session.completed` - Activates subscription after payment
- `customer.subscription.updated` - Updates subscription status
- `customer.subscription.deleted` - Handles cancellation
- `invoice.payment_failed` - Logs payment failures

## Flow

1. Call `billing.api.createSubscription()` to create a subscription and get checkout URL
2. Redirect user to Stripe Checkout
3. User completes payment
4. Stripe sends webhook to `/api/billing/webhook`
5. BillSDK activates the subscription

```typescript
// Create subscription
const { subscription, checkoutUrl } = await billing.api.createSubscription({
  customerId: "user_123",
  planCode: "pro",
  successUrl: "https://app.com/success",
  cancelUrl: "https://app.com/pricing",
});

// Redirect to checkout
redirect(checkoutUrl);
```
