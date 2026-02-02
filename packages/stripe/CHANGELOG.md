# @billsdk/stripe

## 2.0.0

### Patch Changes

- Updated dependencies [3a20ed7]
  - @billsdk/core@0.4.0

## 1.1.0

### Minor Changes

- 66c98fc: Refactored to use PaymentIntent instead of Stripe Subscriptions

  BillSDK now owns all billing logic (subscriptions, proration, renewals). Stripe only handles payment processing.
  - **Free plans**: Use `mode: "setup"` in Checkout to collect card for future use without charging
  - **Paid plans**: Use `mode: "payment"` with `setup_future_usage: "off_session"` to charge and save card
  - **Upgrades/renewals**: Direct charge via `PaymentIntent` using saved payment method
  - Added `charge()` method for off-session payments (renewals, upgrades)
  - Added `refund()` method for processing refunds
  - Webhook now sets `default_payment_method` on Stripe customer after checkout
  - Webhook handles both `checkout.session.completed` (setup and payment modes) and `payment_intent.payment_failed`
  - `charge()` now includes `billsdkSubscriptionId` in metadata for failed payment tracking
  - Payment mode webhook throws error if `payment_intent` is missing (fail-fast)

### Patch Changes

- Updated dependencies [66c98fc]
  - @billsdk/core@0.3.1

## 1.0.1

### Patch Changes

- Updated dependencies [3ec3adb]
  - @billsdk/core@0.3.0

## 1.0.0

### Patch Changes

- Updated dependencies [05561bb]
  - @billsdk/core@0.2.0
