# @billsdk/stripe

## 1.1.0

### Minor Changes

- 66c98fc: Refactored Stripe adapter to use PaymentIntent instead of Stripe Subscriptions

  BillSDK now owns all billing logic (subscriptions, proration, renewals). Stripe only handles payment processing.

  ### @billsdk/stripe

  - **Free plans**: Use `mode: "setup"` in Checkout to collect card for future use without charging
  - **Paid plans**: Use `mode: "payment"` with `setup_future_usage: "off_session"` to charge and save card
  - **Upgrades/renewals**: Direct charge via `PaymentIntent` using saved payment method
  - Added `charge()` method for off-session payments (renewals, upgrades)
  - Added `refund()` method for processing refunds
  - Webhook now sets `default_payment_method` on Stripe customer after checkout
  - Webhook handles both `checkout.session.completed` (setup and payment modes) and `payment_intent.payment_failed`
  - `charge()` now includes `billsdkSubscriptionId` in metadata for failed payment tracking
  - Payment mode webhook throws error if `payment_intent` is missing (fail-fast)

  ### @billsdk/core

  - Added `providerPaymentId`, `amount`, and `currency` fields to `ConfirmResult` interface
  - Added `ChargeParams` and `ChargeResult` types for direct charging
  - Added `RefundParams` and `RefundResult` types for refund processing
  - Added optional `charge()` and `refund()` methods to `PaymentAdapter` interface

  ### billsdk

  - Webhook handler now creates payment records when payments are confirmed
  - Payment records include amount, currency, provider payment ID, and subscription metadata

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
