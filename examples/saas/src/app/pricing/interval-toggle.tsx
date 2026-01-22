"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";

const intervals = ["monthly", "yearly"] as const;

export function IntervalToggle() {
  const [interval, setInterval] = useQueryState(
    "interval",
    parseAsStringLiteral(intervals)
      .withDefault("monthly")
      .withOptions({ shallow: false }), // Trigger server re-render
  );

  return (
    <div className="inline-flex items-center gap-2 p-1 bg-muted rounded-lg">
      <Button
        variant={interval === "monthly" ? "default" : "ghost"}
        size="sm"
        onClick={() => setInterval("monthly")}
      >
        Monthly
      </Button>
      <Button
        variant={interval === "yearly" ? "default" : "ghost"}
        size="sm"
        onClick={() => setInterval("yearly")}
      >
        Yearly
        <span className="ml-1 text-xs text-primary">Save 17%</span>
      </Button>
    </div>
  );
}
