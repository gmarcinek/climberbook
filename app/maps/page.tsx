import { MapsModule } from "@/components/climberbook/modules/maps/MapsModule";
import { PlatformAppShell } from "@/components/platform/PlatformAppShell";
import { requireAuthenticatedUser } from "@/lib/server/require-auth";

export default async function MapsAppPage() {
  await requireAuthenticatedUser();
  return (
    <PlatformAppShell app="maps" title="Maps">
      <MapsModule />
    </PlatformAppShell>
  );
}
