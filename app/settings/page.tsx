import { PlatformAppShell } from "@/components/platform/PlatformAppShell";
import { PlatformSettings } from "@/components/platform/PlatformSettings";
import { requireAuthenticatedUser } from "@/lib/server/require-auth";
import { getPlatformUserById } from "@/lib/server/platform-user";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/server/auth-options";

export default async function PlatformSettingsPage() {
  await requireAuthenticatedUser();
  const session = await getServerSession(authOptions);
  const user = session?.user?.id
    ? await getPlatformUserById(session.user.id)
    : null;

  return (
    <PlatformAppShell app="settings" title="Ustawienia">
      <PlatformSettings initialUser={user} />
    </PlatformAppShell>
  );
}
