import { stripePayment } from "@billsdk/stripe";
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
      code: "pro",
      name: "Pro",
      description: "Everything you need",
      prices: [
        { amount: 2000, interval: "monthly" }, // $20/mo
        { amount: 20000, interval: "yearly" }, // $200/yr (2 months free)
      ],
      features: ["export", "api_access", "custom_domain", "priority_support"],
    },
  ],
});
