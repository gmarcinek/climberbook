import { DashboardLayout } from "@/components/climberbook/layout/DashboardLayout";
import { TrainingEditorPage } from "@/components/climberbook/modules/training/TrainingEditorPage";
import { requireAuthenticatedUser } from "@/lib/server/require-auth";

function isIsoDate(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export default async function AddTrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  await requireAuthenticatedUser();
  const { data } = await searchParams;
  const date = isIsoDate(data) ? data : new Date().toISOString().slice(0, 10);

  return (
    <DashboardLayout>
      <TrainingEditorPage mode="add" date={date} />
    </DashboardLayout>
  );
}