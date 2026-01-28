import type {
  OnPaymentFailedParams,
  OnPaymentFailedResult,
  OnRefundParams,
  OnRefundResult,
  OnSubscriptionCancelParams,
  OnSubscriptionCancelResult,
  OnTrialEndParams,
  OnTrialEndResult,
} from "@billsdk/core";
import type { BillingContext } from "../../context/create-context";
import { defaultBehaviors } from "./defaults";

/**
 * Map of behavior names to their parameter and result types.
 * Used for type inference in runBehavior.
 */
type BehaviorConfig = {
  onRefund: { params: OnRefundParams; result: OnRefundResult };
  onPaymentFailed: {
    params: OnPaymentFailedParams;
    result: OnPaymentFailedResult;
  };
  onSubscriptionCancel: {
    params: OnSubscriptionCancelParams;
    result: OnSubscriptionCancelResult;
  };
  onTrialEnd: { params: OnTrialEndParams; result: OnTrialEndResult };
};

/**
 * Run a billing behavior with optional user override.
 *
 * This is the core of the configurable behaviors system:
 * 1. If the user provided an override, call it with the default as an argument
 * 2. If no override, run the default behavior
 *
 * The behavior controls the entire operation and returns the result.
 *
 * @param ctx - The billing context
 * @param behaviorName - Name of the behavior to run
 * @param params - Input parameters for the behavior
 * @returns The result of the behavior operation
 *
 * @example
 * ```typescript
 * // Entry point calls behavior with inputs:
 * const result = await runBehavior(ctx, "onRefund", {
 *   paymentId: "pay_123",
 *   amount: 1000,
 * });
 * ```
 */
export async function runBehavior<T extends keyof BehaviorConfig>(
  ctx: BillingContext,
  behaviorName: T,
  params: BehaviorConfig[T]["params"],
): Promise<BehaviorConfig[T]["result"]> {
  const userBehavior = ctx.options.behaviors?.[behaviorName];
  const defaultFn = defaultBehaviors[behaviorName];

  // Create the default behavior function that the user can optionally call
  const defaultBehavior = async (): Promise<BehaviorConfig[T]["result"]> => {
    // biome-ignore lint/suspicious/noExplicitAny: Type narrowing is handled by the caller
    return defaultFn(ctx, params as any);
  };

  if (userBehavior) {
    ctx.logger.debug(`Running user-defined behavior: ${behaviorName}`);
    // User provided an override - call it with the default available
    // biome-ignore lint/suspicious/noExplicitAny: Type narrowing is handled by the caller
    return userBehavior(ctx as any, params as any, defaultBehavior as any);
  }

  ctx.logger.debug(`Running default behavior: ${behaviorName}`);
  // No override - run the default
  return defaultBehavior();
}
