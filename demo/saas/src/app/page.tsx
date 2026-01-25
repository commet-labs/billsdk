import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";

export default async function HomePage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  redirect("/login");
}
