import { createBillingClient } from "@billsdk/core/react";

export const billingClient = createBillingClient();

// Re-export hooks for convenience
export const { useCustomer, useSubscription, usePlans } = billingClient;
