import type { Payment } from "@billsdk/core";
import type { BillingContext } from "../context/create-context";
import { runBehavior } from "./behaviors/runner";

export interface CreateRefundParams {
  /**
   * Payment ID to refund (BillSDK payment ID)
   */
  paymentId: string;
  /**
   * Amount to refund in cents (partial refund)
   * If omitted, full refund is issued
   */
  amount?: number;
  /**
   * Reason for the refund
   */
  reason?: string;
}

export interface CreateRefundResult {
  refund: Payment;
  originalPayment: Payment;
}

/**
 * Create a refund for a payment.
 *
 * This is the single source of truth for refund logic.
 * Both HTTP endpoints and direct API methods should use this function.
 */
export async function createRefund(
  ctx: BillingContext,
  params: CreateRefundParams,
): Promise<CreateRefundResult> {
  const { paymentId, amount, reason } = params;

  // Check if payment adapter supports refunds
  if (!ctx.paymentAdapter?.refund) {
    throw new Error("Payment adapter does not support refunds");
  }

  // Find the payment
  const payment = await ctx.internalAdapter.findPaymentById(paymentId);
  if (!payment) {
    throw new Error("Payment not found");
  }

  // Check payment is refundable
  if (payment.status !== "succeeded") {
    throw new Error(`Cannot refund payment with status "${payment.status}"`);
  }

  // Check if already fully refunded
  const alreadyRefunded = payment.refundedAmount ?? 0;
  const remainingAmount = payment.amount - alreadyRefunded;

  if (remainingAmount <= 0) {
    throw new Error("Payment has already been fully refunded");
  }

  // Determine refund amount
  const refundAmount = amount ?? remainingAmount;

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
    reason,
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
      reason,
    },
  });

  ctx.logger.info("Refund processed", {
    originalPaymentId: payment.id,
    refundPaymentId: refundPayment.id,
    amount: refundAmount,
  });

  // Get customer for behavior
  const customer = await ctx.internalAdapter.findCustomerById(
    payment.customerId,
  );
  if (!customer) {
    throw new Error("Customer not found for payment");
  }

  // Get subscription if payment was for a subscription
  const subscription = payment.subscriptionId
    ? await ctx.internalAdapter.findSubscriptionById(payment.subscriptionId)
    : undefined;

  // Run the onRefund behavior (default: cancel subscription)
  await runBehavior(ctx, "onRefund", {
    payment: {
      ...payment,
      status: newStatus,
      refundedAmount: newRefundedAmount,
    },
    refund: refundPayment,
    subscription: subscription ?? undefined,
    customer,
  });

  return {
    refund: refundPayment,
    originalPayment: {
      ...payment,
      status: newStatus,
      refundedAmount: newRefundedAmount,
    },
  };
}
