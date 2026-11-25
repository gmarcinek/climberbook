import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import {
  authOptions,
  isSocialLoginConfigured,
} from "@/lib/server/auth-options";

export async function requireAuthenticatedUser() {
  // Auth env vars are absent during `next build`; without this the page would be
  // prerendered once as anonymous and served from cache in production.
  await connection();
  if (!isSocialLoginConfigured()) return;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  return session.user;
}