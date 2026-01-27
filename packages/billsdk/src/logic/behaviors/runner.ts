import type { BillingBehaviors } from "@billsdk/core";
import type { BillingContext } from "../../context/create-context";
import { defaultBehaviors } from "./defaults";

/**
 * Map of behavior names to their parameter types.
 * Used for type inference in runBehavior.
 */
type BehaviorParams = {
  onRefund: Parameters<NonNullable<BillingBehaviors["onRefund"]>>[1];
  onPaymentFailed: Parameters<
    NonNullable<BillingBehaviors["onPaymentFailed"]>
  >[1];
  onSubscriptionCancel: Parameters<
    NonNullable<BillingBehaviors["onSubscriptionCancel"]>
  >[1];
  onTrialEnd: Parameters<NonNullable<BillingBehaviors["onTrialEnd"]>>[1];
  onDowngrade: Parameters<NonNullable<BillingBehaviors["onDowngrade"]>>[1];
};

/**
 * Run a billing behavior with optional user override.
 *
 * This is the core of the configurable behaviors system:
 * 1. If the user provided an override, call it with the default as an argument
 * 2. If no override, run the default behavior
 *
 * @param ctx - The billing context
 * @param behaviorName - Name of the behavior to run
 * @param params - Parameters for the behavior
 *
 * @example
 * ```typescript
 * // In refund-service.ts, after processing refund:
 * await runBehavior(ctx, "onRefund", {
 *   payment,
 *   refund: refundPayment,
 *   subscription,
 *   customer,
 * });
 * ```
 */
export async function runBehavior<T extends keyof BehaviorParams>(
  ctx: BillingContext,
  behaviorName: T,
  params: BehaviorParams[T],
): Promise<void> {
  const userBehavior = ctx.options.behaviors?.[behaviorName];
  const defaultFn = defaultBehaviors[behaviorName];

  // Create the default behavior function that the user can optionally call
  const defaultBehavior = async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Type narrowing is handled by the caller
    await defaultFn(ctx, params as any);
  };

  if (userBehavior) {
    ctx.logger.debug(`Running user-defined behavior: ${behaviorName}`);
    // User provided an override - call it with the default available
    // biome-ignore lint/suspicious/noExplicitAny: Type narrowing is handled by the caller
    await userBehavior(ctx as any, params, defaultBehavior);
  } else {
    ctx.logger.debug(`Running default behavior: ${behaviorName}`);
    // No override - run the default
    await defaultBehavior();
  }
}
