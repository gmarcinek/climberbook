import { notFound } from "next/navigation";
import ClimberbookApp from "@/components/climberbook/ClimberbookApp";
import { getModuleKeyFromRoute } from "@/components/climberbook/common/modules";

export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const initialModule = getModuleKeyFromRoute(module);

  if (!initialModule) {
    notFound();
  }

  return <ClimberbookApp initialModule={initialModule} />;
}
