"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { subscribeAction } from "./actions";

interface SubscribeButtonProps {
  planCode: string;
  interval: "monthly" | "yearly";
  isPopular?: boolean;
  isAuthenticated?: boolean;
  isCurrentPlan?: boolean;
}

export function SubscribeButton({
  planCode,
  interval,
  isPopular,
  isAuthenticated,
  isCurrentPlan,
}: SubscribeButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (isCurrentPlan) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    startTransition(() => subscribeAction(planCode, interval));
  }

  const buttonText = () => {
    if (isPending) return "Loading...";
    if (isCurrentPlan) return "Current Plan";
    if (!isAuthenticated) return "Get Started";
    return "Subscribe";
  };

  return (
    <Button
      className="w-full"
      variant={isCurrentPlan ? "secondary" : isPopular ? "default" : "outline"}
      onClick={handleClick}
      disabled={isPending || isCurrentPlan}
    >
      {buttonText()}
    </Button>
  );
}
