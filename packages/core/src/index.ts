// BillSDK Core - Infrastructure for plugin authors
// This package provides types, helpers, and utilities for creating BillSDK plugins.

export type {
  BillingMiddleware,
  GenericBillingContext,
  GenericEndpointContext,
  MiddlewareContext,
  MiddlewareHandler,
  MiddlewareMatcher,
} from "./api";

// Re-export API helpers for creating endpoints
export {
  createBillingEndpoint,
  createBillingMiddleware,
  matchAll,
  matchMethod,
  matchPath,
} from "./api";
export type { BaseErrorCode, HttpStatus } from "./error";

// Re-export error handling
export { BASE_ERROR_CODES, BillingError, defineErrorCodes } from "./error";
// Re-export all types
export type * from "./types";

// Re-export time provider
export { createDefaultTimeProvider } from "./types/time";

// Re-export utilities
export {
  addDays,
  addMonths,
  formatCurrency,
  generateId,
  isFuture,
  isPast,
  sleep,
} from "./utils";
