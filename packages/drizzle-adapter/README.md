# @billsdk/drizzle-adapter

Drizzle ORM adapter for BillSDK.

## Installation

```bash
npm install @billsdk/drizzle-adapter drizzle-orm
```

## Usage

```typescript
import { billsdk } from "billsdk";
import { drizzleAdapter } from "@billsdk/drizzle-adapter";
import { db } from "./db";
import * as schema from "./schema";

const billing = billsdk({
  database: drizzleAdapter(db, {
    schema,
    provider: "pg", // or "mysql" | "sqlite"
  }),
  plans: [
    // your plans...
  ],
});
```

## Configuration

| Option | Type | Description |
|--------|------|-------------|
| `schema` | `Record<string, any>` | Your Drizzle schema object |
| `provider` | `"pg" \| "mysql" \| "sqlite"` | Database provider |
| `debugLogs` | `boolean` | Enable debug logging (default: false) |

## Convenience Import

You can also import from billsdk directly:

```typescript
import { drizzleAdapter } from "billsdk/adapters/drizzle";
```
