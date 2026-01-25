# @billsdk/payment-adapter

Default payment adapter for BillSDK. Activates subscriptions immediately without requiring payment.

## Installation

```bash
npm install @billsdk/payment-adapter
```

## Usage

```typescript
import { billsdk } from "billsdk";
import { paymentAdapter } from "@billsdk/payment-adapter";

const billing = billsdk({
  payment: paymentAdapter(),
  plans: [
    // your plans...
  ],
});
```

## When to Use

- Development and testing environments
- Free-tier only applications
- When you handle payments outside of BillSDK

## Behavior

All subscriptions are activated immediately with `status: "active"`. No payment flow is required.

## Convenience Import

You can also import from billsdk directly:

```typescript
import { paymentAdapter } from "billsdk/adapters/payment";
```
