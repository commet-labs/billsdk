import Link from "next/link";
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

export default async function SettingsPage() {
  const session = await getSession();
  const user = session!.user;

  const subscription = await billing.api.getSubscription({
    customerId: user.id,
  });

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
    <>
      {subscription ? (
        <>
          {/* Current Plan Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Current Plan
                  </CardTitle>
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
                <span className="text-muted-foreground flex items-center gap-1">
                  Current Period
                </span>
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

          {/* Cancel Subscription Card */}
          <Card className={isCanceled ? "border-destructive/50" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
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
                    . You&apos;ll continue to have access to all features until
                    then.
                  </p>
                </div>
              ) : (
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    If you cancel, you&apos;ll still have access to your current
                    plan until{" "}
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
        <Card>
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
      )}
    </>
  );
}
