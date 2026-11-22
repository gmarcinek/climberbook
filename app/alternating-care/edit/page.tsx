import { EditPage } from "@modules/EditPage/EditPage";
import { Suspense } from "react";

export default function AlternatingCareEditRoute() {
  return (
    <Suspense fallback={null}>
      <EditPage />
    </Suspense>
  );
}
