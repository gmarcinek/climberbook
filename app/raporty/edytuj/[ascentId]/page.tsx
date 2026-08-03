import { notFound } from "next/navigation";
import { ModuleLayout } from "@/components/climberbook/layout/ModuleLayout";
import { AscentEditorPage } from "@/components/climberbook/modules/reports/AscentEditorPage";
import { requireAuthenticatedUser } from "@/lib/server/require-auth";

export default async function EditAscentPage({
  params,
}: {
  params: Promise<{ ascentId: string }>;
}) {
  await requireAuthenticatedUser();
  const { ascentId } = await params;

  if (!/^\d+$/.test(ascentId) || Number(ascentId) < 1) notFound();

  return (
    <ModuleLayout activeModule="raportowy">
      <AscentEditorPage ascentId={Number(ascentId)} />
    </ModuleLayout>
  );
}