import { ModelsModule } from "@/components/climberbook/modules/models/ModelsModule";
import { PlatformAppShell } from "@/components/platform/PlatformAppShell";
import { requireAuthenticatedUser } from "@/lib/server/require-auth";

export default async function ModelsAppPage() {
  await requireAuthenticatedUser();
  return (
    <PlatformAppShell app="models" title="Modele">
      <ModelsModule />
    </PlatformAppShell>
  );
}
