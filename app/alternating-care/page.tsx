"use client";

import { Suspense } from "react";
import { DashboardPage } from "@modules/DashboardPage/DashboardPage";

export default function AlternatingCarePage() {
  return (
    <Suspense fallback={null}>
      <DashboardPage />
    </Suspense>
  );
}
