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
import { CancelButton } from "./cancel-button";
import { SignOutButton } from "./sign-out-button";

// All features defined in billing config
const ALL_FEATURES = [
  {
    code: "export",
    name: "Export Data",
    description: "Export your data in multiple formats",
  },
  {
    code: "api_access",
    name: "API Access",
    description: "Full REST API access",
  },
  {
    code: "custom_domain",
    name: "Custom Domain",
    description: "Use your own domain",
  },
  {
    code: "priority_support",
    name: "Priority Support",
    description: "24/7 priority support",
  },
] as const;

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const { user } = session;

  // Use user.id as customerId (externalId in billing)
  const subscription = await billing.api.getSubscription({
    customerId: user.id,
  });

  const enabledFeatures = subscription
    ? await billing.api.listFeatures({ customerId: user.id })
    : [];

  const enabledCodes = new Set(enabledFeatures.map((f) => f.code));

  const plan = subscription
    ? await billing.api.getPlan({ code: subscription.planCode })
    : null;

  const price = plan?.prices.find((p) => p.interval === subscription?.interval);

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatPrice = (amount: number | undefined, currency = "usd") => {
    if (amount === undefined) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const isCanceled = !!subscription?.cancelAt;

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold">billSDK</span>
              <span className="text-xs text-neutral-500">demo</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.name}</span>
            <SignOutButton />
          </div>
        </div>

        {/* Subscription Section */}
        {subscription ? (
          <>
            {/* Current Plan Card */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Current Plan</CardTitle>
                    <CardDescription>Your subscription details</CardDescription>
                  </div>
                  {isCanceled ? (
                    <Badge variant="destructive">Canceling</Badge>
                  ) : (
                    <Badge className="bg-green-500">Active</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-semibold">{plan?.name}</span>
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
                  <span className="text-muted-foreground">Current Period</span>
                  <span>
                    {formatDate(subscription.currentPeriodStart)} -{" "}
                    {formatDate(subscription.currentPeriodEnd)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    {isCanceled ? "Access Until" : "Next Billing Date"}
                  </span>
                  <span
                    className={isCanceled ? "text-destructive font-medium" : ""}
                  >
                    {formatDate(
                      subscription.cancelAt ?? subscription.currentPeriodEnd,
                    )}
                  </span>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/pricing">Change Plan</Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Features Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Features</CardTitle>
                <CardDescription>
                  Features available on your current plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {ALL_FEATURES.map((feature) => {
                    const isEnabled = enabledCodes.has(feature.code);
                    return (
                      <div
                        key={feature.code}
                        className={`flex items-start gap-3 p-4 rounded-lg border ${
                          isEnabled
                            ? "bg-green-950/20 border-green-800"
                            : "bg-muted/50 border-muted"
                        }`}
                      >
                        <div>
                          <p
                            className={`font-medium ${
                              isEnabled ? "" : "text-muted-foreground"
                            }`}
                          >
                            {feature.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Cancel Subscription Card */}
            <Card className={isCanceled ? "border-destructive/50" : ""}>
              <CardHeader>
                <CardTitle className="text-destructive">
                  {isCanceled ? "Subscription Canceled" : "Cancel Subscription"}
                </CardTitle>
                <CardDescription>
                  {isCanceled
                    ? "Your subscription has been canceled"
                    : "Cancel your subscription at the end of the current billing period"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isCanceled ? (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <p className="text-sm">
                      Your subscription will end on{" "}
                      <span className="font-semibold">
                        {formatDate(subscription.cancelAt)}
                      </span>
                      . You&apos;ll continue to have access to all features
                      until then.
                    </p>
                  </div>
                ) : (
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                      If you cancel, you&apos;ll still have access to your
                      current plan until{" "}
                      <span className="font-semibold">
                        {formatDate(subscription.currentPeriodEnd)}
                      </span>
                      . After that, you&apos;ll be downgraded to the free plan.
                    </p>
                  </div>
                )}
              </CardContent>
              {!isCanceled && (
                <CardFooter>
                  <CancelButton />
                </CardFooter>
              )}
            </Card>
          </>
        ) : (
          <>
            {/* No Subscription Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>No Active Subscription</CardTitle>
                <CardDescription>
                  You don&apos;t have an active subscription yet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Choose a plan to get started with all the features you need.
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/pricing">View Plans</Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Features Preview Card */}
            <Card>
              <CardHeader>
                <CardTitle>Available Features</CardTitle>
                <CardDescription>
                  Subscribe to unlock these features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {ALL_FEATURES.map((feature) => (
                    <div
                      key={feature.code}
                      className="flex items-start gap-3 p-4 rounded-lg border bg-muted/50 border-muted"
                    >
                      <div>
                        <p className="font-medium text-muted-foreground">
                          {feature.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
