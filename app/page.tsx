import { Lobby } from "@/components/platform/Lobby";
import { requireAuthenticatedUser } from "@/lib/server/require-auth";

export default async function HomePage() {
  await requireAuthenticatedUser();
  return <Lobby />;
}
