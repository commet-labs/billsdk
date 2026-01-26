import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // If already logged in, redirect to dashboard
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="max-w-4xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold">billSDK</span>
          <span className="text-xs text-neutral-500">demo</span>
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
}
