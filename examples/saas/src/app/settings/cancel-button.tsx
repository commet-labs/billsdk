"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cancelSubscriptionAction } from "./actions";

export function CancelButton() {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCancel = async () => {
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await cancelSubscriptionAction();

    if (result.success) {
      router.refresh();
    } else {
      setError(result.error ?? "Failed to cancel subscription");
      setIsLoading(false);
      setIsConfirming(false);
    }
  };

  if (error) {
    return (
      <div className="w-full">
        <p className="text-destructive text-sm mb-2">{error}</p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setError(null)}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {isConfirming && (
        <p className="text-sm text-destructive">
          Are you sure? This action cannot be undone.
        </p>
      )}
      <div className="flex gap-2">
        {isConfirming && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setIsConfirming(false)}
            disabled={isLoading}
          >
            Keep Subscription
          </Button>
        )}
        <Button
          variant="destructive"
          className={isConfirming ? "flex-1" : "w-full"}
          onClick={handleCancel}
          disabled={isLoading}
        >
          {isLoading
            ? "Canceling..."
            : isConfirming
              ? "Yes, Cancel"
              : "Cancel Subscription"}
        </Button>
      </div>
    </div>
  );
}
