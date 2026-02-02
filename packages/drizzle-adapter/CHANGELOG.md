# @billsdk/drizzle-adapter

## 2.0.0

### Patch Changes

- 3a20ed7: Add adapter factory pattern and export schema utilities

  **@billsdk/core:**
  - Added `createAdapterFactory` for building custom adapters with shared logic (type transformations, ID generation, transactions)
  - New export path `@billsdk/core/db/adapter`
  - Export adapter types: `AdapterFactory`, `AdapterFactoryConfig`, `AdapterHelpers`, `CustomAdapter`, `CleanedWhere`
  - Export schema utilities: `billingSchema`, `defineField`, `defineTable`, `getBillingSchema`, `TABLES`
  - Export schema types: `DBSchema`, `DBTableSchema`, `DBFieldAttribute`, `DBFieldType`, `DBFieldReference`

  **@billsdk/drizzle-adapter & @billsdk/memory-adapter:**
  - Refactored to use `createAdapterFactory` internally (no public API changes)

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

### Patch Changes

- Updated dependencies [05561bb]
  - @billsdk/core@0.2.0
