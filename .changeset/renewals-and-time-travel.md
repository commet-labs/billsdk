---
"@billsdk/core": minor
"billsdk": minor
---

Add recurring billing/renewals and time-travel support

**@billsdk/core:**
- Add `TimeProvider` interface for time abstraction
- Add `scheduledPlanCode` and `scheduledInterval` fields to Subscription model
- Add `processRenewals` to InferredAPI types

**billsdk:**
- Add `processRenewals()` API for processing subscription renewals
- Add `GET /renewals` endpoint (built-in, zero code for users)
- Add scheduled downgrade support (applies at period end)
- Integrate TimeProvider for time-based operations
