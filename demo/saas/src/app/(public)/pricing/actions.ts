"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { billing } from "@/lib/billing";

export async function subscribeAction(
  planCode: string,
  interval: "monthly" | "yearly",
) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;

  // Get or create customer
  let customer = await billing.api.getCustomer({ externalId: user.id });

  if (!customer) {
    customer = await billing.api.createCustomer({
      externalId: user.id,
      email: user.email,
      name: user.name,
    });
  }

  // Create subscription
  const result = await billing.api.createSubscription({
    customerId: customer.externalId,
    planCode,
    interval,
    successUrl: "http://localhost:3000/success",
    cancelUrl: "http://localhost:3000/cancel",
  });

  // Redirect to payment or success
  if (result.redirectUrl) {
    redirect(result.redirectUrl);
  }

  redirect("/success");
}
