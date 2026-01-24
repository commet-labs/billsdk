"use server";

import { revalidatePath } from "next/cache";
import { billing } from "@/lib/billing";
import { getSession } from "@/lib/auth-server";

export async function cancelSubscriptionAction() {
  try {
    const session = await getSession();

    if (!session) {
      return { success: false, error: "Not authenticated" };
    }

    const result = await billing.api.cancelSubscription({
      customerId: session.user.id,
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
