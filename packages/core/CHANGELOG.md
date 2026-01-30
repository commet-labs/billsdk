# @billsdk/core

## 0.3.1

### Patch Changes

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

## 0.3.0

### Minor Changes

- 3ec3adb: Add recurring billing/renewals and time-travel support

  **@billsdk/core:**

  - Add `TimeProvider` interface for time abstraction
  - Add `scheduledPlanCode` and `scheduledInterval` fields to Subscription model
  - Add `processRenewals` to InferredAPI types

  **billsdk:**

  - Add `processRenewals()` API for processing subscription renewals
  - Add `GET /renewals` endpoint (built-in, zero code for users)
  - Add scheduled downgrade support (applies at period end)
  - Integrate TimeProvider for time-based operations

## 0.2.0

### Minor Changes

- 05561bb: Add payment primitives, behaviors system, and proration support

  **@billsdk/core:**

  - Add `Payment` model with `PaymentStatus` and `PaymentType` types
  - Add `ChargeParams`, `ChargeResult`, `RefundParams`, `RefundResult` types for payment operations
  - Add `BillingBehaviors` interface for customizable billing event handling (`onRefund`, `onPaymentFailed`, `onTrialEnd`)
  - Add `changeSubscription` and `createRefund` methods to the API interface
  - Add payment table to the billing schema

  **billsdk:**

  - Add payment endpoints (`/payments`, `/payment`) for listing and retrieving payments
  - Add refund endpoint (`/refund`) for processing refunds
  - Implement behaviors system with configurable defaults for refund, payment failure, and trial end handling
  - Add proration calculations for plan upgrades/downgrades
  - Add services: `subscription-service`, `refund-service`, `proration`, `renewal`, `payment-failed-service`, `trial-end-service`
  - Support `changeSubscription` API for plan transitions with automatic proration

  **@billsdk/payment-adapter:**

  - Add `charge()` method for direct charges (renewals, upgrades)
  - Add `refund()` method for processing refunds
  - Return mock `providerCustomerId` in `processPayment()` for testing flows
