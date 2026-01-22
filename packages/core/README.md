# @billsdk/core

Core billing engine for BillSDK. Contains types, schema, internal adapter, and API implementation.

## Installation

```bash
pnpm add @billsdk/core
```

## Usage

```typescript
import { billsdk, memoryAdapter } from "@billsdk/core";

export const billing = billsdk({
  database: memoryAdapter(), // Use @billsdk/drizzle for production
  basePath: "/api/billing",
});

// HTTP handler for frameworks
export const handler = billing.handler;

// Direct API access
const customer = await billing.api.createCustomer({
  externalId: "user_123",
  email: "user@example.com",
});
```

## Features

- **Database Abstraction**: Pluggable database adapters
- **Payment Abstraction**: Pluggable payment adapters
- **Feature Flags**: Boolean feature checks for plans
- **Subscription Management**: Create and manage subscriptions
- **Webhook Handling**: Process payment provider webhooks

## API

### `billsdk(options)`

Creates a BillSDK instance.

```typescript
const billing = billsdk({
  database: adapter, // DBAdapter implementation
  payment: paymentAdapter, // Optional PaymentAdapter
  basePath: "/api/billing", // API base path
  secret: "your-secret", // Secret for signing
  plugins: [], // Optional plugins
});
```

### `billing.api`

Direct API access for server-side usage:

- `createCustomer(data)` - Create a customer
- `getCustomer({ externalId })` - Get customer by external ID
- `listPlans()` - List all public plans
- `getPlan({ id })` - Get plan by ID
- `getSubscription({ customerId })` - Get active subscription
- `createSubscription(params)` - Create subscription with checkout
- `checkFeature({ customerId, feature })` - Check feature access
- `listFeatures({ customerId })` - List customer's features

### `billing.handler`

HTTP request handler compatible with Web Standard Request/Response.

```typescript
// Next.js App Router
export const { GET, POST, PUT, DELETE } = {
  GET: billing.handler,
  POST: billing.handler,
  PUT: billing.handler,
  DELETE: billing.handler,
};
```

## Sub-exports

- `@billsdk/core` - Main exports
- `@billsdk/core/client` - Client SDK for frontend
- `@billsdk/core/db` - Database utilities
- `@billsdk/core/api` - API router
- `@billsdk/core/adapters/memory` - Memory adapter for testing
