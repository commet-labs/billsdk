// BillSDK Core - The billing engine for SaaS applications

// Main factory
export { billsdk, createBillSDK, default } from "./billsdk";

// Adapters
export { memoryAdapter } from "./adapters/memory-adapter";

// Context
export type { BillingContext, Logger } from "./context/create-context";
export { createBillingContext } from "./context/create-context";

// Database
export type { DBFieldAttribute, DBSchema, DBTableSchema } from "./db/field";
export { defineField, defineTable } from "./db/field";
export { getBillingSchema, TABLES } from "./db/schema";
export type { InternalAdapter } from "./db/internal-adapter";
export { createInternalAdapter } from "./db/internal-adapter";

// API
export { createRouter, getEndpoints } from "./api";

// Types
export type * from "./types";

// Utils
export * from "./utils";
