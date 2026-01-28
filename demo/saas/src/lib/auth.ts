import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Only run on sign-up endpoints
      if (!ctx.path.startsWith("/sign-up")) {
        return;
      }

      const newSession = ctx.context.newSession;
      if (!newSession) {
        return;
      }

      const user = newSession.user;
      console.log("[auth] New user signed up, setting up billing:", user.id);

      try {
        // Dynamic import to avoid circular dependency
        const { billing } = await import("./billing");

        // Create billing customer for new user
        const customer = await billing.api.createCustomer({
          externalId: user.id,
          email: user.email,
          name: user.name,
        });
        console.log("[auth] Customer created:", customer.id);

        // Assign free plan automatically using the API
        const { subscription } = await billing.api.createSubscription({
          customerId: user.id, // externalId
          planCode: "free",
          interval: "monthly",
        });
        console.log(
          "[auth] Free subscription created for user:",
          user.id,
          subscription.id,
        );
      } catch (error) {
        console.error(
          "[auth] Failed to setup billing for user:",
          user.id,
          error,
        );
      }
    }),
  },
});

export type Session = typeof auth.$Infer.Session;
