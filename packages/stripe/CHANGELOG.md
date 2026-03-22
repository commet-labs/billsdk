# @billsdk/stripe

## 1.2.0

### Minor Changes

- [#16](https://github.com/commet-labs/billsdk/pull/16) [`81d6167`](https://github.com/commet-labs/billsdk/commit/81d61671054a5b0ddfd8d8973076b5da8986c6b2) Thanks [@decker-dev](https://github.com/decker-dev)! - feat: implement free trial flow
  - Trial subscriptions go through checkout to collect payment method without charging
  - Cron automatically processes expired trials via `onTrialEnd` behavior
  - Default: charges first period if payment method exists, cancels if not
  - Override `onTrialEnd` behavior for custom logic (extend trial, downgrade, etc.)
  - Added `PaymentParams.trial` field for provider-agnostic trial support
  - Fixed webhook overriding `trialing` status to `active`
  - Added trial helpers: `isInTrial`, `daysRemainingInTrial`, `getTrialInfo`
  - Handle plan change during trial (ends trial, charges new plan immediately)

### Patch Changes

- Updated dependencies [[`81d6167`](https://github.com/commet-labs/billsdk/commit/81d61671054a5b0ddfd8d8973076b5da8986c6b2)]:
  - @billsdk/core@0.6.0

## 1.1.2

### Patch Changes

- Updated dependencies [[`976ba1b`](https://github.com/commet-labs/billsdk/commit/976ba1b6a04bc1610dc0da32b676fd542348235f)]:
  - @billsdk/core@0.5.0

## 1.1.1

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
