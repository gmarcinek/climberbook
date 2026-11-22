"use client";

import dynamic from "next/dynamic";

const DashboardPage = dynamic(
  () =>
    import("@modules/DashboardPage/DashboardPage").then(
      (module) => module.DashboardPage,
    ),
  { ssr: false, loading: () => null },
);

export default function AlternatingCareAddPage() {
  return <DashboardPage mobileView="add" />;
}
