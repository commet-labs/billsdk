"use client";

import type { Plan } from "@billsdk/core";
import { useState } from "react";
import { PricingCard } from "@/components/pricing-card";
import { Button } from "@/components/ui/button";

type BillingInterval = "monthly" | "yearly";

interface PricingClientProps {
  plans: Plan[];
}

export function PricingClient({ plans }: PricingClientProps) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  async function handleSubscribe(planCode: string, billingInterval: string) {
    // For demo purposes, create a test customer and subscribe
    // In a real app, you'd get the customer from your auth system
    const customerId = `demo-customer-${Date.now()}`;

    try {
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

      // Then create the subscription (using externalId, not internal id)
      const subscriptionResponse = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.externalId,
          planCode,
          interval: billingInterval,
          successUrl: `${window.location.origin}/success`,
          cancelUrl: `${window.location.origin}/cancel`,
        }),
      });

      if (!subscriptionResponse.ok) {
        const error = await subscriptionResponse.json();
        throw new Error(error.message || "Failed to create subscription");
      }

      const { checkoutUrl } = await subscriptionResponse.json();

      // Redirect to Stripe checkout
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (err) {
      console.error("Subscription error:", err);
      alert(err instanceof Error ? err.message : "Failed to subscribe");
    }
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            Choose the plan that works best for you
          </p>

          {/* Interval Toggle */}
          <div className="inline-flex items-center gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={interval === "monthly" ? "default" : "ghost"}
              size="sm"
              onClick={() => setInterval("monthly")}
            >
              Monthly
            </Button>
            <Button
              variant={interval === "yearly" ? "default" : "ghost"}
              size="sm"
              onClick={() => setInterval("yearly")}
            >
              Yearly
              <span className="ml-1 text-xs text-primary">Save 17%</span>
            </Button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <PricingCard
              key={plan.code}
              plan={plan}
              interval={interval}
              isPopular={plan.code === "pro"}
              onSubscribe={handleSubscribe}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>All plans include a 14-day free trial. No credit card required.</p>
          <p className="mt-2">
            Need a custom plan?{" "}
            <a
              href="mailto:sales@example.com"
              className="text-primary hover:underline"
            >
              Contact sales
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
