import { z } from "zod";
import type { BillingEndpoint, EndpointContext } from "../../types/api";

/**
 * Create customer schema
 */
const createCustomerSchema = z.object({
  externalId: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Get customer query schema
 */
const getCustomerQuerySchema = z.object({
  externalId: z.string().min(1),
});

/**
 * Customer endpoints
 */
export const customerEndpoints: Record<string, BillingEndpoint> = {
  createCustomer: {
    path: "/customer",
    options: {
      method: "POST",
      body: createCustomerSchema,
    },
    handler: async (context: EndpointContext<z.infer<typeof createCustomerSchema>>) => {
      const { ctx, body } = context;

      // Check if customer already exists
      const existing = await ctx.internalAdapter.findCustomerByExternalId(body.externalId);
      if (existing) {
        return { customer: existing };
      }

      // Create customer
      const customer = await ctx.internalAdapter.createCustomer(body);
      return { customer };
    },
  },

  getCustomer: {
    path: "/customer",
    options: {
      method: "GET",
      query: getCustomerQuerySchema,
    },
    handler: async (context: EndpointContext<unknown, z.infer<typeof getCustomerQuerySchema>>) => {
      const { ctx, query } = context;

      const customer = await ctx.internalAdapter.findCustomerByExternalId(query.externalId);
      if (!customer) {
        return { customer: null };
      }

      return { customer };
    },
  },
};
