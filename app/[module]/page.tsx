import { notFound } from "next/navigation";
import { getModuleKeyFromRoute } from "@/components/climberbook/common/modules";
import { DashboardLayout } from "@/components/climberbook/layout/DashboardLayout";
import { ModuleLayout } from "@/components/climberbook/layout/ModuleLayout";
import { moduleComponents } from "@/components/climberbook/modules/module-components";
import { requireAuthenticatedUser } from "@/lib/server/require-auth";

export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  await requireAuthenticatedUser();
  const { module } = await params;
  const key = getModuleKeyFromRoute(module);

  if (!key) {
    notFound();
  }

  const ModuleComponent = moduleComponents[key];

  if (key === "treningowy") {
    return (
      <DashboardLayout>
        <ModuleComponent />
      </DashboardLayout>
    );
  }

  return (
    <ModuleLayout activeModule={key}>
      <ModuleComponent />
    </ModuleLayout>
  );
}
