import { stripePayment } from "@billsdk/stripe";
import { timeTravelPlugin } from "@billsdk/time-travel";
import { billsdk } from "billsdk";
import { drizzleAdapter } from "billsdk/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema";

/**
 * BillSDK - Demo SaaS billing configuration
 */
export const billing = billsdk({
  database: drizzleAdapter(db, {
    schema,
    provider: "pg",
  }),

  payment: stripePayment({
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  }),

  plugins: [timeTravelPlugin()],

  features: [
    { code: "export", name: "Export Data" },
    { code: "api_access", name: "API Access" },
    { code: "custom_domain", name: "Custom Domain" },
    { code: "priority_support", name: "Priority Support" },
  ],

  plans: [
    {
      code: "free",
      name: "Free",
      description: "Get started for free",
      prices: [{ amount: 0, interval: "monthly" }],
      features: ["export"],
    },
    {
      code: "starter",
      name: "Starter",
      description: "Starter plan",
      prices: [
        { amount: 1000, interval: "monthly" },
        { amount: 10000, interval: "yearly" },
      ],
      features: ["export", "api_access"],
    },
    {
      code: "pro",
      name: "Pro",
      description: "Everything you need",
      prices: [
        { amount: 2000, interval: "monthly" },
        { amount: 20000, interval: "yearly" },
      ],
      features: ["export", "api_access", "custom_domain", "priority_support"],
    },
  ],
});
