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
import { getSession } from "@/lib/auth-server";
import { billing } from "@/lib/billing";

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
  const user = session!.user;

  // Use user.id as customerId (externalId in billing)
  const subscription = await billing.api.getSubscription({
    customerId: user.id,
  });

  const enabledFeatures = subscription
    ? await billing.api.listFeatures({ customerId: user.id })
    : [];

  const enabledCodes = new Set(enabledFeatures.map((f) => f.code));
  return (
    <>
      {/* Features Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Features</CardTitle>
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
    </>
  );
}
