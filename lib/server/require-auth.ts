import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  authOptions,
  isSocialLoginConfigured,
} from "@/lib/server/auth-options";

export async function requireAuthenticatedUser() {
  if (!isSocialLoginConfigured()) return;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
}