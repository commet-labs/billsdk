import { TimeTravelOverlay } from "@billsdk/time-travel/react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <>
      {children}
      <TimeTravelOverlay baseUrl="/api/billing" customerId={session.user.id} />
    </>
  );
}
