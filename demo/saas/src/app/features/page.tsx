import { ArrowRight, Check, Lock, Sparkles } from "lucide-react";
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
import { getSession } from "@/lib/auth-server";
import { billing } from "@/lib/billing";

// Feature demos with mock functionality
const FEATURE_DEMOS = [
  {
    code: "export",
    name: "Export Data",
    description: "Export your data in CSV, JSON, or Excel formats",
    icon: "📊",
    demo: "Click to download a sample export file",
  },
  {
    code: "api_access",
    name: "API Access",
    description: "Full REST API access with documentation",
    icon: "🔌",
    demo: "View API documentation and generate keys",
  },
  {
    code: "custom_domain",
    name: "Custom Domain",
    description: "Use your own domain for a branded experience",
    icon: "🌐",
    demo: "Configure your custom domain settings",
  },
  {
    code: "priority_support",
    name: "Priority Support",
    description: "24/7 priority support with dedicated agent",
    icon: "💬",
    demo: "Open a priority support ticket",
  },
] as const;

export default async function FeaturesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const { user } = session;

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

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            Feature Demo
          </Badge>
          <h1 className="text-4xl font-bold mb-4">Explore Features</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            See what features are available on your plan. Locked features
            require an upgrade to access.
          </p>
          {plan && (
            <p className="mt-4 text-sm">
              Current plan: <span className="font-semibold">{plan.name}</span>
            </p>
          )}
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {FEATURE_DEMOS.map((feature) => {
            const isEnabled = enabledCodes.has(feature.code);
            return (
              <Card
                key={feature.code}
                className={`relative overflow-hidden transition-all ${
                  isEnabled
                    ? "border-green-200 dark:border-green-800"
                    : "border-muted opacity-75"
                }`}
              >
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  {isEnabled ? (
                    <Badge className="bg-green-500">
                      <Check className="h-3 w-3 mr-1" />
                      Available
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Lock className="h-3 w-3 mr-1" />
                      Locked
                    </Badge>
                  )}
                </div>

                <CardHeader>
                  <div className="text-4xl mb-2">{feature.icon}</div>
                  <CardTitle>{feature.name}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>

                <CardContent>
                  <div
                    className={`p-4 rounded-lg ${
                      isEnabled
                        ? "bg-green-50 dark:bg-green-950/20"
                        : "bg-muted/50"
                    }`}
                  >
                    {isEnabled ? (
                      <div>
                        <p className="text-sm font-medium mb-2">
                          ✨ Feature Available
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {feature.demo}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium mb-2">
                          🔒 Upgrade Required
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Upgrade to Pro to unlock this feature
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter>
                  {isEnabled ? (
                    <Button className="w-full" variant="outline">
                      Try Feature
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button asChild className="w-full">
                      <Link href="/pricing">
                        Upgrade to Unlock
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <div className="inline-flex gap-4">
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
            {!subscription && (
              <Button asChild>
                <Link href="/pricing">View Pricing</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
