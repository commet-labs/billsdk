"use server";

import { revalidatePath } from "next/cache";
import { billing } from "@/lib/billing";
import { DEMO_USER_ID } from "@/lib/constants";

export async function cancelSubscriptionAction() {
  try {
    const result = await billing.api.cancelSubscription({
      customerId: DEMO_USER_ID,
      cancelAt: "period_end",
    });

    if (!result) {
      return { success: false, error: "No active subscription found" };
    }

    revalidatePath("/settings");
    revalidatePath("/dashboard");

    return { success: true, subscription: result };
  } catch (error) {
    console.error("Failed to cancel subscription:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel",
    };
  }
}
