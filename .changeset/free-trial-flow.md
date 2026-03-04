---
"@billsdk/core": minor
"billsdk": minor
"@billsdk/stripe": minor
---

feat: implement free trial flow

- Trial subscriptions go through checkout to collect payment method without charging
- Cron automatically processes expired trials via `onTrialEnd` behavior
- Default: charges first period if payment method exists, cancels if not
- Override `onTrialEnd` behavior for custom logic (extend trial, downgrade, etc.)
- Added `PaymentParams.trial` field for provider-agnostic trial support
- Fixed webhook overriding `trialing` status to `active`
- Added trial helpers: `isInTrial`, `daysRemainingInTrial`, `getTrialInfo`
- Handle plan change during trial (ends trial, charges new plan immediately)
