import { relations } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const customer = pgTable("customer", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  externalId: text("external_id").unique().notNull(),
  email: text("email").notNull(),
  name: text("name"),
  providerCustomerId: text("provider_customer_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscription = pgTable("subscription", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id")
    .references(() => customer.id, { onDelete: "cascade" })
    .notNull(),
  planCode: text("plan_code").notNull(),
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
  scheduledPlanCode: text("scheduled_plan_code"),
  scheduledInterval: text("scheduled_interval"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payment = pgTable("payment", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id")
    .references(() => customer.id, { onDelete: "cascade" })
    .notNull(),
  subscriptionId: text("subscription_id"),
  type: text("type").notNull(),
  status: text("status").default("pending").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").default("usd").notNull(),
  providerPaymentId: text("provider_payment_id"),
  refundedAmount: integer("refunded_amount"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const time_travel_state = pgTable("time_travel_state", {
  id: text("id").notNull(),
  simulatedTime: timestamp("simulated_time"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const customerRelations = relations(customer, ({ many }) => ({
  subscriptions: many(subscription),
  payments: many(payment),
}));

export const subscriptionRelations = relations(subscription, ({ one }) => ({
  customer: one(customer, {
    fields: [subscription.customerId],
    references: [customer.id],
  }),
}));

export const paymentRelations = relations(payment, ({ one }) => ({
  customer: one(customer, {
    fields: [payment.customerId],
    references: [customer.id],
  }),
}));
