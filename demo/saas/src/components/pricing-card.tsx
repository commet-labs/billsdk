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
  children: React.ReactNode; // SubscribeButton slot
}

export function PricingCard({
  plan,
  interval,
  isPopular,
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
    <Card className={isPopular ? "border-primary shadow-lg" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{plan.name}</CardTitle>
          {isPopular && <Badge>Popular</Badge>}
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
              <span className="text-sm">{formatFeatureName(feature)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>{children}</CardFooter>
    </Card>
  );
}

function formatFeatureName(code: string): string {
  return code
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
