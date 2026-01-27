import { z } from "zod";
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

      // Check if payment adapter supports refunds
      if (!ctx.paymentAdapter?.refund) {
        throw new Error("Payment adapter does not support refunds");
      }

      // Find the payment
      const payment = await ctx.internalAdapter.findPaymentById(body.paymentId);
      if (!payment) {
        throw new Error("Payment not found");
      }

      // Check payment is refundable
      if (payment.status !== "succeeded") {
        throw new Error(
          `Cannot refund payment with status "${payment.status}"`,
        );
      }

      // Check if already fully refunded
      const alreadyRefunded = payment.refundedAmount ?? 0;
      const remainingAmount = payment.amount - alreadyRefunded;

      if (remainingAmount <= 0) {
        throw new Error("Payment has already been fully refunded");
      }

      // Determine refund amount
      const refundAmount = body.amount ?? remainingAmount;

      if (refundAmount > remainingAmount) {
        throw new Error(
          `Cannot refund ${refundAmount}. Only ${remainingAmount} is available for refund.`,
        );
      }

      // Check if payment has a provider payment ID
      if (!payment.providerPaymentId) {
        throw new Error(
          "Payment does not have a provider payment ID. Cannot process refund.",
        );
      }

      // Call the adapter to process the refund
      const result = await ctx.paymentAdapter.refund({
        providerPaymentId: payment.providerPaymentId,
        amount: refundAmount,
        reason: body.reason,
      });

      if (result.status === "failed") {
        throw new Error(result.error ?? "Refund failed");
      }

      // Update the original payment with refunded amount
      const newRefundedAmount = alreadyRefunded + refundAmount;
      const newStatus =
        newRefundedAmount >= payment.amount ? "refunded" : "succeeded";

      await ctx.internalAdapter.updatePayment(payment.id, {
        status: newStatus,
        refundedAmount: newRefundedAmount,
      });

      // Record the refund as a negative payment
      const refundPayment = await ctx.internalAdapter.createPayment({
        customerId: payment.customerId,
        subscriptionId: payment.subscriptionId ?? undefined,
        type: "refund",
        status: "succeeded",
        amount: -refundAmount, // Negative to indicate refund
        currency: payment.currency,
        providerPaymentId: result.providerRefundId,
        metadata: {
          originalPaymentId: payment.id,
          reason: body.reason,
        },
      });

      ctx.logger.info("Refund processed", {
        originalPaymentId: payment.id,
        refundPaymentId: refundPayment.id,
        amount: refundAmount,
      });

      return {
        refund: refundPayment,
        originalPayment: {
          ...payment,
          status: newStatus,
          refundedAmount: newRefundedAmount,
        },
      };
    },
  },
};
