import { PricingCard } from "@/components/pricing-card";
import { billing } from "@/lib/billing";
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

  const plans = await billing.api.listPlans();

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            Start free, upgrade when you need more
          </p>

          <IntervalToggle />
        </div>

        {/* Pricing Cards - 2 columns for 2 plans */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
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
          <p>No credit card required for the free plan.</p>
        </div>
      </div>
    </div>
  );
}
