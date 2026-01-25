import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth-server";
import { billing } from "@/lib/billing";

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
  const session = await getSession();

  if (!session) {
    // Not logged in, show fallback
    if (fallback) return <>{fallback}</>;
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed bg-muted/50">
        <p className="text-muted-foreground text-center mb-4">
          Please sign in to access this feature
        </p>
        <Button asChild size="sm">
          <Link href="/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  const { allowed } = await billing.api.checkFeature({
    customerId: session.user.id,
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
      <p className="text-muted-foreground text-center mb-4">
        This feature requires an upgrade
      </p>
      <Button asChild size="sm">
        <Link href="/pricing">Upgrade Now</Link>
      </Button>
    </div>
  );
}
