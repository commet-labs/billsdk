# @billsdk/payment-adapter

## 1.0.3

### Patch Changes

- Updated dependencies [3a20ed7]
  - @billsdk/core@0.4.0

## 1.0.2

### Patch Changes

- Updated dependencies [66c98fc]
  - @billsdk/core@0.3.1

## 1.0.1

### Patch Changes

- Updated dependencies [3ec3adb]
  - @billsdk/core@0.3.0

## 1.0.0

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
