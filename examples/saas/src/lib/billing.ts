import { billsdk } from "@billsdk/core";
import { drizzleAdapter } from "@billsdk/drizzle";
import { stripePayment } from "@billsdk/stripe";
import { db } from "./db";
import * as schema from "./db/schema";

/**
 * BillSDK instance for the SaaS example
 */
export const billing = billsdk({
  // Database adapter
  database: drizzleAdapter(db, {
    schema,
    provider: "pg",
  }),

  // Payment adapter (Stripe)
  payment: stripePayment({
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  }),

  // API base path
  basePath: "/api/billing",

  // Secret for signing
  secret: process.env.BILLSDK_SECRET || "dev-secret-change-in-production",

  // Define features
  features: [
    {
      code: "api_calls",
      name: "API Calls",
      type: "metered",
    },
    {
      code: "custom_domain",
      name: "Custom Domain",
      type: "boolean",
    },
    {
      code: "priority_support",
      name: "Priority Support",
      type: "boolean",
    },
  ],

  // Define plans
  plans: [
    {
      code: "free",
      name: "Free",
      description: "For individuals and small projects",
      prices: [{ amount: 0, interval: "monthly" }],
      features: ["api_calls"],
    },
    {
      code: "pro",
      name: "Pro",
      description: "For growing teams and businesses",
      prices: [
        { amount: 2900, interval: "monthly" },
        { amount: 29000, interval: "yearly" },
      ],
      features: ["api_calls", "custom_domain"],
    },
    {
      code: "enterprise",
      name: "Enterprise",
      description: "For large organizations with advanced needs",
      prices: [
        { amount: 9900, interval: "monthly" },
        { amount: 99000, interval: "yearly" },
      ],
      features: ["api_calls", "custom_domain", "priority_support"],
    },
  ],
});
