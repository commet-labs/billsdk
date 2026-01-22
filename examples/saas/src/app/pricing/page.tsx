import { bill } from "@/lib/billing";
import { PricingCard } from "@/components/pricing-card";
import { IntervalToggle } from "./interval-toggle";
import { SubscribeButton } from "./subscribe-button";

type BillingInterval = "monthly" | "yearly";

interface PageProps {
  searchParams: Promise<{ interval?: string }>;
}

export default async function PricingPage({ searchParams }: PageProps) {
  const { interval: intervalParam } = await searchParams;
  const interval: BillingInterval =
    intervalParam === "yearly" ? "yearly" : "monthly";

  const plans = await bill.api.listPlans();

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

          <IntervalToggle />
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const price = plan.prices.find((p) => p.interval === interval);
            const amount = price?.amount ?? 0;

            return (
              <PricingCard
                key={plan.code}
                plan={plan}
                interval={interval}
                isPopular={plan.code === "pro"}
              >
                <SubscribeButton
                  planCode={plan.code}
                  interval={interval}
                  amount={amount}
                  isPopular={plan.code === "pro"}
                />
              </PricingCard>
            );
          })}
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
