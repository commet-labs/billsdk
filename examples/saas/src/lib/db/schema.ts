import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";

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
 * Plan table - pricing packages
 */
export const plan = pgTable("plan", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").unique().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Plan Price table - pricing per interval
 */
export const planPrice = pgTable("plan_price", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id")
    .references(() => plan.id, { onDelete: "cascade" })
    .notNull(),
  amount: integer("amount").notNull(), // In cents
  currency: text("currency").default("usd").notNull(),
  interval: text("interval").notNull(), // "monthly" | "quarterly" | "yearly"
  isDefault: boolean("is_default").default(false).notNull(),
  trialDays: integer("trial_days"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Subscription table - customer-plan contract
 */
export const subscription = pgTable("subscription", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .references(() => customer.id, { onDelete: "cascade" })
    .notNull(),
  planId: uuid("plan_id")
    .references(() => plan.id, { onDelete: "restrict" })
    .notNull(),
  priceId: uuid("price_id")
    .references(() => planPrice.id, { onDelete: "restrict" })
    .notNull(),
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

/**
 * Feature table - product capabilities
 */
export const feature = pgTable("feature", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").unique().notNull(),
  name: text("name").notNull(),
  type: text("type").default("boolean").notNull(), // "boolean" | "metered" | "seats"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Plan Feature table - features per plan
 */
export const planFeature = pgTable("plan_feature", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id")
    .references(() => plan.id, { onDelete: "cascade" })
    .notNull(),
  featureCode: text("feature_code").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
