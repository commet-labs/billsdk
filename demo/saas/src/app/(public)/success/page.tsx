import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getSession } from "@/lib/auth-server";
import { billing } from "@/lib/billing";

export default async function SuccessPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const { user } = session;

  const subscription = await billing.api.getSubscription({
    customerId: user.id,
  });

  const plan = subscription
    ? await billing.api.getPlan({ code: subscription.planCode })
    : null;

  const price = plan?.prices.find((p) => p.interval === subscription?.interval);

  const features = subscription
    ? await billing.api.listFeatures({ customerId: user.id })
    : [];

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatPrice = (amount: number | undefined, currency = "usd") => {
    if (amount === undefined) return "Free";
    if (amount === 0) return "Free";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Thank you for subscribing. Your account has been upgraded.
          </CardDescription>
        </CardHeader>

        {subscription && plan && (
          <CardContent className="space-y-4">
            {/* Plan Details */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Plan</span>
                <Badge variant="secondary">{plan.name}</Badge>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Price</span>
                <span className="font-semibold">
                  {formatPrice(price?.amount, price?.currency)} /{" "}
                  {subscription.interval}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1">
                  Next billing
                </span>
                <span>{formatDate(subscription.currentPeriodEnd)}</span>
              </div>
            </div>

            {/* Features Unlocked */}
            {features.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                  Features unlocked
                </p>
                <div className="flex flex-wrap gap-2">
                  {features.map((feature) => (
                    <Badge key={feature.code} variant="outline">
                      {feature.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}

        <CardFooter className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
