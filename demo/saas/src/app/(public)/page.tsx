import Link from "next/link";
import { getSession } from "@/lib/auth-server";

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-4xl font-bold">billSDK</h1>
        <span className="text-xs text-neutral-500">demo</span>
      </div>
      <div className="flex gap-4 text-sm">
        {session ? (
          <Link
            href="/dashboard"
            className="underline underline-offset-4 hover:opacity-70"
          >
            dashboard
          </Link>
        ) : (
          <Link
            href="/signup"
            className="underline underline-offset-4 hover:opacity-70"
          >
            enter
          </Link>
        )}
      </div>
    </div>
  );
}
