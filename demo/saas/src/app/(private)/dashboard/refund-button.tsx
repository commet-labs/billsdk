"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { refundPaymentAction } from "./actions";

interface RefundButtonProps {
  paymentId: string;
  amount: string;
}

export function RefundButton({ paymentId, amount }: RefundButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRefund = () => {
    setError(null);
    startTransition(async () => {
      const result = await refundPaymentAction(paymentId);

      if (result.success) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error ?? "Failed to process refund");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          Request Refund
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Refund</DialogTitle>
          <DialogDescription>
            Submit a refund request for this payment.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted rounded-lg p-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            You are requesting a refund of{" "}
            <span className="font-semibold">{amount}</span>.
          </p>
          <p className="text-sm text-destructive font-medium">
            Your subscription will be canceled immediately.
          </p>
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleRefund} disabled={isPending}>
            {isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
