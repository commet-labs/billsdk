"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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
      // For demo purposes, create a test customer and subscribe
      // In a real app, you'd get the customer from your auth system
      const customerId = `demo-customer-${Date.now()}`;

      // First, create the customer
      const customerResponse = await fetch("/api/billing/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalId: customerId,
          email: "demo@example.com",
          name: "Demo User",
        }),
      });

      if (!customerResponse.ok) {
        const error = await customerResponse.json();
        throw new Error(error.message || "Failed to create customer");
      }

      const { customer } = await customerResponse.json();

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
