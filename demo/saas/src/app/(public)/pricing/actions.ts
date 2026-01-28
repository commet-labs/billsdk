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

  let customer = await billing.api.getCustomer({ externalId: user.id });

  if (!customer) {
    customer = await billing.api.createCustomer({
      externalId: user.id,
      email: user.email,
      name: user.name,
    });
  }

  const currentSubscription = await billing.api.getSubscription({
    customerId: user.id,
  });

  if (currentSubscription && currentSubscription.planCode !== planCode) {
    await billing.api.changeSubscription({
      customerId: user.id,
      newPlanCode: planCode,
      prorate: true,
    });

    redirect("/dashboard");
  }

  const result = await billing.api.createSubscription({
    customerId: customer.externalId,
    planCode,
    interval,
    successUrl: "http://localhost:3001/success",
    cancelUrl: "http://localhost:3001/cancel",
  });

  if (result.redirectUrl) {
    redirect(result.redirectUrl);
  }

  redirect("/success");
}
