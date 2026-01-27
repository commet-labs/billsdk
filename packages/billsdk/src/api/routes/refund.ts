import { z } from "zod";
import type { BillingContext } from "../../context/create-context";
import { createRefund as createRefundService } from "../../logic/refund-service";
import type { BillingEndpoint, EndpointContext } from "../../types/api";

/**
 * Create refund schema
 */
const createRefundSchema = z.object({
  /**
   * Payment ID to refund (BillSDK payment ID)
   */
  paymentId: z.string().min(1),
  /**
   * Amount to refund in cents (partial refund)
   * If omitted, full refund is issued
   */
  amount: z.number().positive().optional(),
  /**
   * Reason for the refund
   */
  reason: z.string().optional(),
});

/**
 * Refund endpoints
 */
export const refundEndpoints: Record<string, BillingEndpoint> = {
  createRefund: {
    path: "/refund",
    options: {
      method: "POST",
      body: createRefundSchema,
    },
    handler: async (
      context: EndpointContext<z.infer<typeof createRefundSchema>>,
    ) => {
      const { ctx, body } = context;

      // Delegate to shared service
      return createRefundService(ctx as BillingContext, {
        paymentId: body.paymentId,
        amount: body.amount,
        reason: body.reason,
      });
    },
  },
};
