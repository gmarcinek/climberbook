import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/climberbook/layout/DashboardLayout";
import { TrainingEditorPage } from "@/components/climberbook/modules/training/TrainingEditorPage";
import { requireAuthenticatedUser } from "@/lib/server/require-auth";

export default async function EditTrainingPage({
  params,
}: {
  params: Promise<{ trainingId: string }>;
}) {
  await requireAuthenticatedUser();
  const { trainingId } = await params;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      trainingId,
    )
  )
    notFound();

  return (
    <DashboardLayout>
      <TrainingEditorPage mode="edit" trainingId={trainingId} />
    </DashboardLayout>
  );
}