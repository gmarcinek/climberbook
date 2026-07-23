import { notFound } from "next/navigation";
import { ModuleLayout } from "@/components/climberbook/layout/ModuleLayout";
import { SettingsModule } from "@/components/climberbook/modules/settings/SettingsModule";
import { requireAuthenticatedUser } from "@/lib/server/require-auth";

const settingsTabs = new Set(["profil", "zespol", "obiekty", "zaawansowane"]);

export default async function SettingsTabPage({
  params,
}: {
  params: Promise<{ module: string; tab: string }>;
}) {
  await requireAuthenticatedUser();
  const { module, tab } = await params;

  if (module !== "ustawienia" || !settingsTabs.has(tab)) {
    notFound();
  }

  return (
    <ModuleLayout activeModule="ustawienia">
      <SettingsModule />
    </ModuleLayout>
  );
}
