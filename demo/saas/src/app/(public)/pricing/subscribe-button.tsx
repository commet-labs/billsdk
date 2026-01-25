"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { subscribeAction } from "./actions";

interface SubscribeButtonProps {
  planCode: string;
  interval: "monthly" | "yearly";
  amount: number;
  isPopular?: boolean;
  isAuthenticated?: boolean;
}

export function SubscribeButton({
  planCode,
  interval,
  amount,
  isPopular,
  isAuthenticated,
}: SubscribeButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (amount === 0) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    startTransition(() => subscribeAction(planCode, interval));
  }

  const buttonText = () => {
    if (isPending) return "Loading...";
    if (amount === 0) return "Current Plan";
    if (!isAuthenticated) return "Sign in to Subscribe";
    return "Subscribe";
  };

  return (
    <Button
      className="w-full"
      variant={isPopular ? "default" : "outline"}
      onClick={handleClick}
      disabled={isPending || amount === 0}
    >
      {buttonText()}
    </Button>
  );
}
