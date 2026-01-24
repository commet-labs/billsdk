import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Re-export auth schema
export * from "./auth-schema";

/**
 * Customer table - who pays
 */
export const customer = pgTable("customer", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: text("external_id").unique(),
  email: text("email").notNull(),
  name: text("name"),
  providerCustomerId: text("provider_customer_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Subscription table - customer-plan contract
 * Note: plan info comes from config, not DB
 */
export const subscription = pgTable("subscription", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .references(() => customer.id, { onDelete: "cascade" })
    .notNull(),
  // Plan code references config, not a DB table
  planCode: text("plan_code").notNull(),
  // Billing interval
  interval: text("interval").default("monthly").notNull(),
  status: text("status").default("active").notNull(),
  providerSubscriptionId: text("provider_subscription_id"),
  providerCheckoutSessionId: text("provider_checkout_session_id"),
  currentPeriodStart: timestamp("current_period_start").defaultNow().notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  canceledAt: timestamp("canceled_at"),
  cancelAt: timestamp("cancel_at"),
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
