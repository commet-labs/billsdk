import type { Payment, Plan, Subscription } from "@billsdk/core";
import type { BillingContext } from "../context/create-context";
import { calculateProration } from "./proration";

export interface ChangeSubscriptionParams {
  customerId: string;
  newPlanCode: string;
  prorate?: boolean;
}

export interface ChangeSubscriptionResult {
  subscription: Subscription | null;
  previousPlan: Plan | null;
  newPlan: Plan;
  payment: Payment | null;
}

/**
 * Change a subscription to a different plan.
 *
 * This is the single source of truth for subscription change logic.
 * Both HTTP endpoints and direct API methods should use this function.
 */
export async function changeSubscription(
  ctx: BillingContext,
  params: ChangeSubscriptionParams,
): Promise<ChangeSubscriptionResult> {
  const { customerId, newPlanCode, prorate = true } = params;

  // Find customer by external ID
  const customer =
    await ctx.internalAdapter.findCustomerByExternalId(customerId);
  if (!customer) {
    throw new Error("Customer not found");
  }

  // Find active subscription
  const subscription = await ctx.internalAdapter.findSubscriptionByCustomerId(
    customer.id,
  );
  if (!subscription) {
    throw new Error("No active subscription found");
  }

  // Check if already on the same plan
  if (subscription.planCode === newPlanCode) {
    throw new Error("Already on this plan");
  }

  // Get current plan and price
  const oldPlan = ctx.internalAdapter.findPlanByCode(subscription.planCode);
  const oldPrice = ctx.internalAdapter.getPlanPrice(
    subscription.planCode,
    subscription.interval,
  );
  if (!oldPrice) {
    throw new Error("Current plan price not found");
  }

  // Get new plan and price
  const newPlan = ctx.internalAdapter.findPlanByCode(newPlanCode);
  if (!newPlan) {
    throw new Error("New plan not found");
  }

  const newPrice = ctx.internalAdapter.getPlanPrice(
    newPlanCode,
    subscription.interval,
  );
  if (!newPrice) {
    throw new Error(
      `No price found for plan ${newPlanCode} with interval ${subscription.interval}`,
    );
  }

  let payment: Payment | null = null;

  // Calculate and process proration if enabled
  if (prorate) {
    const prorationResult = calculateProration({
      oldPlanAmount: oldPrice.amount,
      newPlanAmount: newPrice.amount,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      changeDate: new Date(),
    });

    ctx.logger.info("Proration calculated", {
      credit: prorationResult.credit,
      charge: prorationResult.charge,
      netAmount: prorationResult.netAmount,
      daysRemaining: prorationResult.daysRemaining,
    });

    // If there's a positive net amount, charge the customer
    if (prorationResult.netAmount > 0) {
      // Check if adapter supports direct charging
      if (!ctx.paymentAdapter?.charge) {
        throw new Error(
          "Payment adapter does not support direct charging. Cannot process upgrade.",
        );
      }

      // Customer must have a saved payment method
      if (!customer.providerCustomerId) {
        throw new Error(
          "Customer does not have a saved payment method. Cannot process upgrade.",
        );
      }

      // Charge the difference
      const chargeResult = await ctx.paymentAdapter.charge({
        customer: {
          id: customer.id,
          email: customer.email,
          providerCustomerId: customer.providerCustomerId,
        },
        amount: prorationResult.netAmount,
        currency: newPrice.currency,
        description: `Upgrade from ${oldPlan?.name ?? subscription.planCode} to ${newPlan.name}`,
        metadata: {
          subscriptionId: subscription.id,
          customerId: customer.id,
          type: "upgrade",
          oldPlanCode: subscription.planCode,
          newPlanCode,
        },
      });

      if (chargeResult.status === "failed") {
        throw new Error(chargeResult.error ?? "Charge failed");
      }

      // Record the payment
      payment = await ctx.internalAdapter.createPayment({
        customerId: customer.id,
        subscriptionId: subscription.id,
        type: "upgrade",
        status: "succeeded",
        amount: prorationResult.netAmount,
        currency: newPrice.currency,
        providerPaymentId: chargeResult.providerPaymentId,
        metadata: {
          oldPlanCode: subscription.planCode,
          newPlanCode,
          proration: {
            credit: prorationResult.credit,
            charge: prorationResult.charge,
          },
        },
      });
    }
    // If netAmount is negative (downgrade), we could issue a credit
    // For now, we just update the plan without refunding
  }

  // Update subscription with new plan
  const updatedSubscription = await ctx.internalAdapter.updateSubscription(
    subscription.id,
    { planCode: newPlanCode },
  );

  return {
    subscription: updatedSubscription,
    previousPlan: oldPlan,
    newPlan,
    payment,
  };
}
