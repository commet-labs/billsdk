import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PricingCardProps {
  plan: {
    code: string;
    name: string;
    description?: string;
    prices: Array<{
      amount: number;
      interval: string;
      currency: string;
    }>;
    features: string[];
  };
  interval: "monthly" | "yearly";
  isPopular?: boolean;
  isCurrentPlan?: boolean;
  children: React.ReactNode; // SubscribeButton slot
}

export function PricingCard({
  plan,
  interval,
  isPopular,
  isCurrentPlan,
  children,
}: PricingCardProps) {
  const price = plan.prices.find((p) => p.interval === interval);
  const amount = price?.amount ?? 0;
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: price?.currency ?? "usd",
    minimumFractionDigits: 0,
  }).format(amount / 100);

  return (
    <Card
      className={
        isCurrentPlan
          ? "border-green-500 shadow-lg ring-2 ring-green-500/20"
          : isPopular
            ? "border-primary shadow-lg"
            : ""
      }
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{plan.name}</CardTitle>
          <div className="flex gap-2">
            {isCurrentPlan && <Badge className="bg-green-500">Your Plan</Badge>}
            {isPopular && !isCurrentPlan && <Badge>Popular</Badge>}
          </div>
        </div>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <span className="text-4xl font-bold">{formattedPrice}</span>
          <span className="text-muted-foreground">
            /{interval === "yearly" ? "year" : "month"}
          </span>
          {interval === "yearly" && amount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Save 2 months with yearly billing
            </p>
          )}
        </div>
        <ul className="space-y-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <CheckIcon />
              <span className="text-sm">{formatFeatureName(feature)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>{children}</CardFooter>
    </Card>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 text-green-500 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function formatFeatureName(code: string): string {
  return code
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
