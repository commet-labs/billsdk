/**
 * Base error codes for BillSDK
 */
export const BASE_ERROR_CODES = {
  // General errors
  INTERNAL_ERROR: {
    code: "INTERNAL_ERROR",
    message: "An internal error occurred",
  },
  NOT_FOUND: {
    code: "NOT_FOUND",
    message: "Resource not found",
  },
  VALIDATION_ERROR: {
    code: "VALIDATION_ERROR",
    message: "Validation failed",
  },
  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    message: "Unauthorized",
  },

  // Customer errors
  CUSTOMER_NOT_FOUND: {
    code: "CUSTOMER_NOT_FOUND",
    message: "Customer not found",
  },
  CUSTOMER_ALREADY_EXISTS: {
    code: "CUSTOMER_ALREADY_EXISTS",
    message: "Customer already exists",
  },

  // Plan errors
  PLAN_NOT_FOUND: {
    code: "PLAN_NOT_FOUND",
    message: "Plan not found",
  },

  // Subscription errors
  SUBSCRIPTION_NOT_FOUND: {
    code: "SUBSCRIPTION_NOT_FOUND",
    message: "Subscription not found",
  },
  SUBSCRIPTION_ALREADY_ACTIVE: {
    code: "SUBSCRIPTION_ALREADY_ACTIVE",
    message: "Subscription is already active",
  },

  // Payment errors
  PAYMENT_FAILED: {
    code: "PAYMENT_FAILED",
    message: "Payment failed",
  },
  PAYMENT_PROVIDER_ERROR: {
    code: "PAYMENT_PROVIDER_ERROR",
    message: "Payment provider error",
  },
} as const;

export type BaseErrorCode = keyof typeof BASE_ERROR_CODES;

/**
 * Define custom error codes for plugins
 *
 * @example
 * ```typescript
 * import { defineErrorCodes } from "@billsdk/core/error";
 *
 * export const STRIPE_ERROR_CODES = defineErrorCodes({
 *   STRIPE_WEBHOOK_INVALID: {
 *     code: "STRIPE_WEBHOOK_INVALID",
 *     message: "Invalid Stripe webhook signature",
 *   },
 * });
 * ```
 */
export function defineErrorCodes<
  T extends Record<string, { code: string; message: string }>,
>(codes: T): T {
  return codes;
}
