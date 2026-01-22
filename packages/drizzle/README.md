# @billsdk/drizzle

Drizzle ORM adapter for BillSDK.

## Installation

```bash
pnpm add @billsdk/drizzle drizzle-orm
```

## Usage

```typescript
import { billsdk } from "billsdk";
import { drizzleAdapter } from "@billsdk/drizzle";
import { db } from "./db";
import * as schema from "./schema";

export const billing = billsdk({
  database: drizzleAdapter(db, {
    schema,
    provider: "pg", // or "mysql", "sqlite"
  }),
});
```

## Configuration

```typescript
interface DrizzleAdapterConfig {
  // The schema object containing your tables
  schema: Record<string, any>;
  
  // Database provider
  provider: "pg" | "mysql" | "sqlite";
  
  // Enable debug logs (optional)
  debugLogs?: boolean;
}
```

## Schema Requirements

Your Drizzle schema must include the following tables to work with BillSDK:

- `customer`
- `plan`
- `planPrice`
- `subscription`
- `feature`
- `planFeature`

See the BillSDK documentation for the full schema definition.

## Supported Databases

- PostgreSQL (via `drizzle-orm/node-postgres` or `drizzle-orm/postgres-js`)
- MySQL (via `drizzle-orm/mysql2`)
- SQLite (via `drizzle-orm/better-sqlite3` or `drizzle-orm/libsql`)
