import {
  Calendar,
  Check,
  CreditCard,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
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
import { billing } from "@/lib/billing";
import { getSession } from "@/lib/auth-server";
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

  // Get plan details
  const plan = subscription
    ? await billing.api.getPlan({ code: subscription.planCode })
    : null;

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "trialing":
        return <Badge className="bg-blue-500">Trial</Badge>;
      case "canceled":
        return <Badge variant="destructive">Canceled</Badge>;
      case "past_due":
        return <Badge variant="destructive">Past Due</Badge>;
      default:
        return <Badge variant="secondary">No Subscription</Badge>;
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
            <SignOutButton />
          </div>
        </div>

        {/* Subscription Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Subscription
                </CardTitle>
                <CardDescription>
                  Your current plan and billing details
                </CardDescription>
              </div>
              {getStatusBadge(subscription?.status)}
            </div>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="text-2xl font-bold">
                    {plan?.name ?? subscription.planCode}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {subscription.interval} billing
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Current Period
                  </p>
                  <p className="font-medium">
                    {formatDate(subscription.currentPeriodStart)} -{" "}
                    {formatDate(subscription.currentPeriodEnd)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next Billing</p>
                  <p className="font-medium">
                    {subscription.cancelAt
                      ? `Cancels ${formatDate(subscription.cancelAt)}`
                      : formatDate(subscription.currentPeriodEnd)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">
                  You don&apos;t have an active subscription yet.
                </p>
                <Button asChild>
                  <Link href="/pricing">View Plans</Link>
                </Button>
              </div>
            )}
          </CardContent>
          {subscription && (
            <CardFooter className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/pricing">Change Plan</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/settings">Manage Billing</Link>
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Features Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Features
            </CardTitle>
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
                        ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                        : "bg-muted/50 border-muted"
                    }`}
                  >
                    <div
                      className={`mt-0.5 rounded-full p-1 ${
                        isEnabled
                          ? "bg-green-500 text-white"
                          : "bg-muted-foreground/20 text-muted-foreground"
                      }`}
                    >
                      {isEnabled ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </div>
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
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/features">
                <Sparkles className="h-4 w-4 mr-2" />
                Try Features Demo
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
