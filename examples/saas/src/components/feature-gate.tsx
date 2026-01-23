import { Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { billing } from "@/lib/billing";
import { DEMO_USER_ID } from "@/lib/constants";

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Server component that gates content based on feature access
 */
export async function FeatureGate({
  feature,
  children,
  fallback,
}: FeatureGateProps) {
  const { allowed } = await billing.api.checkFeature({
    customerId: DEMO_USER_ID,
    feature: feature as
      | "export"
      | "api_access"
      | "custom_domain"
      | "priority_support",
  });

  if (allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default fallback
  return (
    <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed bg-muted/50">
      <Lock className="h-8 w-8 text-muted-foreground mb-4" />
      <p className="text-muted-foreground text-center mb-4">
        This feature requires an upgrade
      </p>
      <Button asChild size="sm">
        <Link href="/pricing">Upgrade Now</Link>
      </Button>
    </div>
  );
}
