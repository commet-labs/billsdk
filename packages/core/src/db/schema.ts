import type { DBSchema } from "./field";
import { defineField, defineTable } from "./field";

// Re-export DBSchema
export type { DBSchema } from "./field";

/**
 * Generate a unique ID
 */
const generateId = () => crypto.randomUUID();

/**
 * Base billing schema
 * Defines the core tables for billing functionality
 */
export const billingSchema: DBSchema = {
  customer: defineTable({
    id: defineField({
      type: "string",
      primaryKey: true,
      defaultValue: generateId,
      input: false,
    }),
    externalId: defineField({
      type: "string",
      unique: true,
      index: true,
    }),
    email: defineField({
      type: "string",
      index: true,
    }),
    name: defineField({
      type: "string",
      required: false,
    }),
    providerCustomerId: defineField({
      type: "string",
      required: false,
      index: true,
    }),
    metadata: defineField({
      type: "json",
      required: false,
    }),
    createdAt: defineField({
      type: "date",
      defaultValue: () => new Date(),
      input: false,
    }),
    updatedAt: defineField({
      type: "date",
      defaultValue: () => new Date(),
      input: false,
    }),
  }),

  plan: defineTable({
    id: defineField({
      type: "string",
      primaryKey: true,
      defaultValue: generateId,
      input: false,
    }),
    code: defineField({
      type: "string",
      unique: true,
      index: true,
    }),
    name: defineField({
      type: "string",
    }),
    description: defineField({
      type: "string",
      required: false,
    }),
    isPublic: defineField({
      type: "boolean",
      defaultValue: true,
    }),
    createdAt: defineField({
      type: "date",
      defaultValue: () => new Date(),
      input: false,
    }),
    updatedAt: defineField({
      type: "date",
      defaultValue: () => new Date(),
      input: false,
    }),
  }),

  planPrice: defineTable({
    id: defineField({
      type: "string",
      primaryKey: true,
      defaultValue: generateId,
      input: false,
    }),
    planId: defineField({
      type: "string",
      index: true,
      references: {
        model: "plan",
        field: "id",
        onDelete: "cascade",
      },
    }),
    amount: defineField({
      type: "number",
    }),
    currency: defineField({
      type: "string",
      defaultValue: "usd",
    }),
    interval: defineField({
      type: "string", // "monthly" | "quarterly" | "yearly"
    }),
    isDefault: defineField({
      type: "boolean",
      defaultValue: false,
    }),
    trialDays: defineField({
      type: "number",
      required: false,
    }),
    createdAt: defineField({
      type: "date",
      defaultValue: () => new Date(),
      input: false,
    }),
  }),

  subscription: defineTable({
    id: defineField({
      type: "string",
      primaryKey: true,
      defaultValue: generateId,
      input: false,
    }),
    customerId: defineField({
      type: "string",
      index: true,
      references: {
        model: "customer",
        field: "id",
        onDelete: "cascade",
      },
    }),
    planId: defineField({
      type: "string",
      index: true,
      references: {
        model: "plan",
        field: "id",
        onDelete: "restrict",
      },
    }),
    priceId: defineField({
      type: "string",
      index: true,
      references: {
        model: "planPrice",
        field: "id",
        onDelete: "restrict",
      },
    }),
    status: defineField({
      type: "string", // SubscriptionStatus
      defaultValue: "active",
    }),
    providerSubscriptionId: defineField({
      type: "string",
      required: false,
      index: true,
    }),
    providerCheckoutSessionId: defineField({
      type: "string",
      required: false,
      index: true,
    }),
    currentPeriodStart: defineField({
      type: "date",
      defaultValue: () => new Date(),
    }),
    currentPeriodEnd: defineField({
      type: "date",
    }),
    canceledAt: defineField({
      type: "date",
      required: false,
    }),
    cancelAt: defineField({
      type: "date",
      required: false,
    }),
    trialStart: defineField({
      type: "date",
      required: false,
    }),
    trialEnd: defineField({
      type: "date",
      required: false,
    }),
    metadata: defineField({
      type: "json",
      required: false,
    }),
    createdAt: defineField({
      type: "date",
      defaultValue: () => new Date(),
      input: false,
    }),
    updatedAt: defineField({
      type: "date",
      defaultValue: () => new Date(),
      input: false,
    }),
  }),

  feature: defineTable({
    id: defineField({
      type: "string",
      primaryKey: true,
      defaultValue: generateId,
      input: false,
    }),
    code: defineField({
      type: "string",
      unique: true,
      index: true,
    }),
    name: defineField({
      type: "string",
    }),
    type: defineField({
      type: "string", // "boolean" | "metered" | "seats"
      defaultValue: "boolean",
    }),
    createdAt: defineField({
      type: "date",
      defaultValue: () => new Date(),
      input: false,
    }),
  }),

  planFeature: defineTable({
    id: defineField({
      type: "string",
      primaryKey: true,
      defaultValue: generateId,
      input: false,
    }),
    planId: defineField({
      type: "string",
      index: true,
      references: {
        model: "plan",
        field: "id",
        onDelete: "cascade",
      },
    }),
    featureCode: defineField({
      type: "string",
      index: true,
    }),
    enabled: defineField({
      type: "boolean",
      defaultValue: true,
    }),
    createdAt: defineField({
      type: "date",
      defaultValue: () => new Date(),
      input: false,
    }),
  }),
};

/**
 * Get the billing schema
 * Can be extended by plugins
 */
export function getBillingSchema(): DBSchema {
  return billingSchema;
}

/**
 * Table names for type safety
 */
export const TABLES = {
  CUSTOMER: "customer",
  PLAN: "plan",
  PLAN_PRICE: "planPrice",
  SUBSCRIPTION: "subscription",
  FEATURE: "feature",
  PLAN_FEATURE: "planFeature",
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];
