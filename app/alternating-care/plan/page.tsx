import { CarePlanner } from "@modules/DashboardPage/components/CarePlanner/CarePlanner";
import { Suspense } from "react";

export default function AlternatingCarePlanRoute() {
  return (
    <Suspense fallback={null}>
      <CarePlanner />
    </Suspense>
  );
}
