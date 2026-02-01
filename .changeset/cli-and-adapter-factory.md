---
"@billsdk/core": minor
"@billsdk/drizzle-adapter": patch
"@billsdk/memory-adapter": patch
---

Add adapter factory pattern and export schema utilities

**@billsdk/core:**
- Added `createAdapterFactory` for building custom adapters with shared logic (type transformations, ID generation, transactions)
- New export path `@billsdk/core/db/adapter`
- Export adapter types: `AdapterFactory`, `AdapterFactoryConfig`, `AdapterHelpers`, `CustomAdapter`, `CleanedWhere`
- Export schema utilities: `billingSchema`, `defineField`, `defineTable`, `getBillingSchema`, `TABLES`
- Export schema types: `DBSchema`, `DBTableSchema`, `DBFieldAttribute`, `DBFieldType`, `DBFieldReference`

**@billsdk/drizzle-adapter & @billsdk/memory-adapter:**
- Refactored to use `createAdapterFactory` internally (no public API changes)
