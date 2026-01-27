import { z } from "zod";
import type { BillingEndpoint, EndpointContext } from "../../types/api";

/**
 * List payments query schema
 */
const listPaymentsQuerySchema = z.object({
  customerId: z.string().min(1),
  limit: z.coerce.number().positive().max(100).optional().default(25),
  offset: z.coerce.number().nonnegative().optional().default(0),
});

/**
 * Get payment query schema
 */
const getPaymentQuerySchema = z.object({
  paymentId: z.string().min(1),
});

/**
 * Payment endpoints
 */
export const paymentEndpoints: Record<string, BillingEndpoint> = {
  listPayments: {
    path: "/payments",
    options: {
      method: "GET",
      query: listPaymentsQuerySchema,
    },
    handler: async (
      context: EndpointContext<
        unknown,
        z.infer<typeof listPaymentsQuerySchema>
      >,
    ) => {
      const { ctx, query } = context;

      // Find customer by external ID
      const customer = await ctx.internalAdapter.findCustomerByExternalId(
        query.customerId,
      );
      if (!customer) {
        return { payments: [] };
      }

      // List payments for customer
      const payments = await ctx.internalAdapter.listPayments(customer.id, {
        limit: query.limit,
        offset: query.offset,
      });

      return { payments };
    },
  },

  getPayment: {
    path: "/payment",
    options: {
      method: "GET",
      query: getPaymentQuerySchema,
    },
    handler: async (
      context: EndpointContext<unknown, z.infer<typeof getPaymentQuerySchema>>,
    ) => {
      const { ctx, query } = context;

      const payment = await ctx.internalAdapter.findPaymentById(
        query.paymentId,
      );

      return { payment };
    },
  },
};
