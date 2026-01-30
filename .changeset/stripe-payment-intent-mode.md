---
"@billsdk/stripe": minor
---

Refactored Stripe adapter to use PaymentIntent instead of Stripe Subscriptions

BillSDK now owns all billing logic (subscriptions, proration, renewals). Stripe only handles payment processing.

Changes:
- **Free plans**: Use `mode: "setup"` in Checkout to collect card for future use without charging
- **Paid plans**: Use `mode: "payment"` with `setup_future_usage: "off_session"` to charge and save card
- **Upgrades/renewals**: Direct charge via `PaymentIntent` using saved payment method
- Added `charge()` method for off-session payments (renewals, upgrades)
- Added `refund()` method for processing refunds
- Webhook now sets `default_payment_method` on Stripe customer after checkout
- Webhook handles both `checkout.session.completed` (setup and payment modes) and `payment_intent.payment_failed`
