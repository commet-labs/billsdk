# @billsdk/memory-adapter

In-memory database adapter for BillSDK. Perfect for testing and development.

## Installation

```bash
npm install @billsdk/memory-adapter
```

## Usage

```typescript
import { billsdk } from "billsdk";
import { memoryAdapter } from "@billsdk/memory-adapter";

const billing = billsdk({
  database: memoryAdapter(),
  plans: [
    // your plans...
  ],
});
```

## Features

- Zero configuration
- Perfect for unit tests
- Fast in-memory operations
- Full DBAdapter interface support

## Note

Data is stored in memory and will be lost when the process restarts.
Do not use in production unless you understand the implications.

## Convenience Import

You can also import from billsdk directly:

```typescript
import { memoryAdapter } from "billsdk/adapters/memory";
```
