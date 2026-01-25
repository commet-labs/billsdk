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
 * Only tables that need persistence - plans/features come from config
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
    // Plan code from config (not a foreign key)
    planCode: defineField({
      type: "string",
      index: true,
    }),
    // Billing interval
    interval: defineField({
      type: "string", // "monthly" | "yearly"
      defaultValue: "monthly",
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
  SUBSCRIPTION: "subscription",
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];
