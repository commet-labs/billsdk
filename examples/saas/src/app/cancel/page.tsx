import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { XCircle } from "lucide-react";

export default function CancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Payment Canceled</CardTitle>
          <CardDescription>
            Your payment was not completed. No charges were made.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            If you experienced any issues or have questions about our pricing,
            please don&apos;t hesitate to contact our support team.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/pricing">Return to Pricing</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="mailto:support@example.com">Contact Support</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
