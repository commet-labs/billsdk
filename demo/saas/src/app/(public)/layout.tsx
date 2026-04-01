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
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-end gap-2 px-4 py-2">
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
      <div className="flex-1">{children}</div>
    </div>
  );
}
