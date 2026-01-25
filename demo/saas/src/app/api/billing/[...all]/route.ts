import { billingHandler } from "@billsdk/next";
import { billing } from "@/lib/billing";

export const { GET, POST } = billingHandler(billing);
