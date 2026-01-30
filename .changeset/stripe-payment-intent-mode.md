---
"@billsdk/stripe": minor
"@billsdk/core": patch
"billsdk": patch
---

Refactored Stripe adapter to use PaymentIntent instead of Stripe Subscriptions

BillSDK now owns all billing logic (subscriptions, proration, renewals). Stripe only handles payment processing.

### @billsdk/stripe

- **Free plans**: Use `mode: "setup"` in Checkout to collect card for future use without charging
- **Paid plans**: Use `mode: "payment"` with `setup_future_usage: "off_session"` to charge and save card
- **Upgrades/renewals**: Direct charge via `PaymentIntent` using saved payment method
- Added `charge()` method for off-session payments (renewals, upgrades)
- Added `refund()` method for processing refunds
- Webhook now sets `default_payment_method` on Stripe customer after checkout
- Webhook handles both `checkout.session.completed` (setup and payment modes) and `payment_intent.payment_failed`

### @billsdk/core

- Added `providerPaymentId`, `amount`, and `currency` fields to `ConfirmResult` interface
- Added `ChargeParams` and `ChargeResult` types for direct charging
- Added `RefundParams` and `RefundResult` types for refund processing
- Added optional `charge()` and `refund()` methods to `PaymentAdapter` interface

### billsdk

- Webhook handler now creates payment records when payments are confirmed
- Payment records include amount, currency, provider payment ID, and subscription metadata
