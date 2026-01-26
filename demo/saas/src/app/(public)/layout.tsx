import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth-server";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="max-w-[1400px] mx-auto w-full">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold">billSDK</span>
            <span className="text-xs text-neutral-500">demo</span>
          </Link>
          <div className="flex items-center gap-2">
            {session ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
