# billsdk

## 0.5.0

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
  - @billsdk/drizzle-adapter@1.0.5
  - @billsdk/memory-adapter@1.0.5
  - @billsdk/payment-adapter@1.0.5

## 0.4.0

### Minor Changes

- [#14](https://github.com/commet-labs/billsdk/pull/14) [`976ba1b`](https://github.com/commet-labs/billsdk/commit/976ba1b6a04bc1610dc0da32b676fd542348235f) Thanks [@decker-dev](https://github.com/decker-dev)! - Added endpoint security: origin validation, CSRF token protection, and Bearer secret for server-to-server calls.

  **Breaking:** `secret` is now required. Set `BILLSDK_SECRET` env var or pass `secret` to `billsdk()`. Generate one with `openssl rand -base64 32`.

  New options:
  - `trustedOrigins` — origins allowed to make mutating requests (supports wildcards)
  - Bearer auth — server-to-server calls can send `Authorization: Bearer <secret>` to bypass browser security checks

  Mutating endpoints (`POST`/`PUT`/`PATCH`/`DELETE`) are now protected by default. `GET` requests and `/webhook` are exempt. The BillSDK client handles CSRF tokens automatically.

### Patch Changes

- Updated dependencies [[`976ba1b`](https://github.com/commet-labs/billsdk/commit/976ba1b6a04bc1610dc0da32b676fd542348235f)]:
  - @billsdk/core@0.5.0
  - @billsdk/drizzle-adapter@1.0.4
  - @billsdk/memory-adapter@1.0.4
  - @billsdk/payment-adapter@1.0.4

## 0.3.2

### Patch Changes

- Updated dependencies [3a20ed7]
  - @billsdk/core@0.4.0
  - @billsdk/drizzle-adapter@1.0.3
  - @billsdk/memory-adapter@1.0.3
  - @billsdk/payment-adapter@1.0.3

## 0.3.1

### Patch Changes

- 66c98fc: Webhook handler now creates payment records when payments are confirmed
  - Payment records include amount, currency, provider payment ID, and subscription metadata

- Updated dependencies [66c98fc]
  - @billsdk/core@0.3.1
  - @billsdk/drizzle-adapter@1.0.2
  - @billsdk/memory-adapter@1.0.2
  - @billsdk/payment-adapter@1.0.2

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

### Patch Changes

- Updated dependencies [3ec3adb]
  - @billsdk/core@0.3.0
  - @billsdk/drizzle-adapter@1.0.1
  - @billsdk/memory-adapter@1.0.1
  - @billsdk/payment-adapter@1.0.1

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

### Patch Changes

- Updated dependencies [05561bb]
  - @billsdk/core@0.2.0
  - @billsdk/payment-adapter@1.0.0
  - @billsdk/drizzle-adapter@1.0.0
  - @billsdk/memory-adapter@1.0.0

## 0.1.5

### Patch Changes

- Fix README image path to use absolute GitHub URL so it displays correctly on npm
