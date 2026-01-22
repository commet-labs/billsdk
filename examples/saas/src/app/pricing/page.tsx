import { billing } from "@/lib/billing";
import { PricingClient } from "./pricing-client";

export default async function PricingPage() {
  const plans = await billing.api.listPlans();

  return <PricingClient plans={plans} />;
}
