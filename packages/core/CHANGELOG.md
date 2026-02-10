# @billsdk/core

## 0.5.0

### Minor Changes

- [#14](https://github.com/commet-labs/billsdk/pull/14) [`976ba1b`](https://github.com/commet-labs/billsdk/commit/976ba1b6a04bc1610dc0da32b676fd542348235f) Thanks [@decker-dev](https://github.com/decker-dev)! - Added endpoint security: origin validation, CSRF token protection, and Bearer secret for server-to-server calls.

  **Breaking:** `secret` is now required. Set `BILLSDK_SECRET` env var or pass `secret` to `billsdk()`. Generate one with `openssl rand -base64 32`.

  New options:
  - `trustedOrigins` — origins allowed to make mutating requests (supports wildcards)
  - Bearer auth — server-to-server calls can send `Authorization: Bearer <secret>` to bypass browser security checks

  Mutating endpoints (`POST`/`PUT`/`PATCH`/`DELETE`) are now protected by default. `GET` requests and `/webhook` are exempt. The BillSDK client handles CSRF tokens automatically.

## 0.4.0

### Minor Changes

- 3a20ed7: Add adapter factory pattern and export schema utilities
  - Added `createAdapterFactory` for building custom adapters with shared logic (type transformations, ID generation, transactions)
  - New export path `@billsdk/core/db/adapter`
  - Export adapter types: `AdapterFactory`, `AdapterFactoryConfig`, `AdapterHelpers`, `CustomAdapter`, `CleanedWhere`
  - Export schema utilities: `billingSchema`, `defineField`, `defineTable`, `getBillingSchema`, `TABLES`
  - Export schema types: `DBSchema`, `DBTableSchema`, `DBFieldAttribute`, `DBFieldType`, `DBFieldReference`

## 0.3.1

### Patch Changes

- 66c98fc: Add payment adapter types for direct charging and refunds
  - Added `providerPaymentId`, `amount`, and `currency` fields to `ConfirmResult` interface
  - Added `ChargeParams` and `ChargeResult` types for direct charging
  - Added `RefundParams` and `RefundResult` types for refund processing
  - Added optional `charge()` and `refund()` methods to `PaymentAdapter` interface

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
