import { z } from "zod";
import type { BillingContext } from "../../context/create-context";
import { processRenewals } from "../../logic/renewal-service";
import type { BillingEndpoint, EndpointContext } from "../../types/api";

/**
 * Query schema for renewals endpoint
 */
const processRenewalsQuerySchema = z.object({
  /**
   * Process only a specific customer (useful for testing)
   */
  customerId: z.string().optional(),

  /**
   * Dry run - don't actually charge, just report what would happen
   */
  dryRun: z
    .string()
    .transform((val) => val === "true")
    .optional(),

  /**
   * Maximum number of subscriptions to process (for batching)
   */
  limit: z
    .string()
    .transform((val) => Number.parseInt(val, 10))
    .refine((val) => !Number.isNaN(val) && val > 0, {
      message: "limit must be a positive number",
    })
    .optional(),
});

/**
 * Renewals endpoints
 *
 * GET /renewals - Process all due renewals
 *
 * This is designed to be called by a cron job (e.g., Vercel Cron).
 * The user just needs to add this to vercel.json:
 *
 * ```json
 * {
 *   "crons": [{
 *     "path": "/api/billing/renewals",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 * ```
 */
export const renewalEndpoints: Record<string, BillingEndpoint> = {
  processRenewals: {
    path: "/renewals",
    options: {
      method: "GET",
      query: processRenewalsQuerySchema,
    },
    handler: async (
      context: EndpointContext<
        unknown,
        z.infer<typeof processRenewalsQuerySchema>
      >,
    ) => {
      const { ctx, query } = context;

      const result = await processRenewals(ctx as BillingContext, {
        customerId: query.customerId,
        dryRun: query.dryRun ?? false,
        limit: query.limit,
      });

      return result;
    },
  },
};
