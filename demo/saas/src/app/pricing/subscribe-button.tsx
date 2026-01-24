"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";

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
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    if (amount === 0) return;

    // Redirect to login if not authenticated
    if (!session?.user) {
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const user = session.user;

      // Check if customer exists, if not create it
      const getCustomerResponse = await fetch(
        `/api/billing/customer?externalId=${user.id}`,
      );
      const customerData = await getCustomerResponse.json();

      let customer = customerData.customer;

      if (!customer) {
        // Create the customer linked to auth user
        const createResponse = await fetch("/api/billing/customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            externalId: user.id,
            email: user.email,
            name: user.name,
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

  const buttonText = () => {
    if (loading) return "Loading...";
    if (amount === 0) return "Current Plan";
    if (!session?.user) return "Sign in to Subscribe";
    return "Subscribe";
  };

  return (
    <Button
      className="w-full"
      variant={isPopular ? "default" : "outline"}
      onClick={handleSubscribe}
      disabled={loading || amount === 0}
    >
      {buttonText()}
    </Button>
  );
}
