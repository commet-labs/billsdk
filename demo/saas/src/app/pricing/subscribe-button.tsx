"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DEMO_USER_ID } from "@/lib/constants";

interface SubscribeButtonProps {
  planCode: string;
  interval: "monthly" | "yearly";
  amount: number;
  isPopular?: boolean;
}

export function SubscribeButton({
  planCode,
  interval,
  amount,
  isPopular,
}: SubscribeButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    if (amount === 0) return;

    setLoading(true);
    try {
      // Use consistent demo user ID
      const customerId = DEMO_USER_ID;

      // Check if customer exists, if not create it
      const getCustomerResponse = await fetch(
        `/api/billing/customer?externalId=${customerId}`
      );
      const customerData = await getCustomerResponse.json();

      let customer = customerData.customer;

      if (!customer) {
        // Create the customer if doesn't exist
        const createResponse = await fetch("/api/billing/customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            externalId: customerId,
            email: "demo@example.com",
            name: "Demo User",
          }),
        });

        if (!createResponse.ok) {
          const error = await createResponse.json();
          throw new Error(error.message || "Failed to create customer");
        }

        const result = await createResponse.json();
        customer = result.customer;
      }

      // Then create the subscription
      const subscriptionResponse = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.externalId,
          planCode,
          interval,
          successUrl: `${window.location.origin}/success`,
          cancelUrl: `${window.location.origin}/cancel`,
        }),
      });

      if (!subscriptionResponse.ok) {
        const error = await subscriptionResponse.json();
        throw new Error(error.message || "Failed to create subscription");
      }

      const { checkoutUrl } = await subscriptionResponse.json();

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (err) {
      console.error("Subscription error:", err);
      alert(err instanceof Error ? err.message : "Failed to subscribe");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      className="w-full"
      variant={isPopular ? "default" : "outline"}
      onClick={handleSubscribe}
      disabled={loading || amount === 0}
    >
      {loading ? "Loading..." : amount === 0 ? "Current Plan" : "Subscribe"}
    </Button>
  );
}
