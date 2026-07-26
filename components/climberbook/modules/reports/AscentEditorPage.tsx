"use client";

import { useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/climberbook/common/Button";
import { frenchGradeOptions } from "@/components/climberbook/common/constants";
import { useReportsModule } from "@/components/climberbook/providers/ClimberbookProvider";
import { AscentFormWidget } from "./components/AscentFormWidget";

export function AscentEditorPage({ ascentId }: { ascentId: number }) {
  const app = useReportsModule();
  const router = useRouter();
  const initializedAscentId = useRef<number | null>(null);
  const ascent = app.ascents.find((candidate) => candidate.id === ascentId);

  useEffect(() => {
    if (ascent && initializedAscentId.current !== ascentId) {
      app.editAscent(ascent);
      initializedAscentId.current = ascentId;
    }
  }, [app, ascent, ascentId]);

  function leaveEditor() {
    app.cancelAscentEdit();
    router.replace("/raporty");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    await app.submitAscent(event);
    router.replace("/raporty");
  }

  const isReady = initializedAscentId.current === ascentId && ascent !== undefined;

  return (
    <section style={{ display: "grid", gap: 16 }} aria-labelledby="ascent-editor-title">
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.78rem" }}>Raporty</p>
          <h1 id="ascent-editor-title" style={{ margin: "2px 0 0", fontSize: "1.2rem" }}>Edytuj przejście</h1>
        </div>
        <Button variant="secondary" onClick={leaveEditor}>Zamknij</Button>
      </header>
      {isReady ? (
        <AscentFormWidget
          ascentDraft={app.ascentDraft}
          editingAscentId={app.editingAscentId}
          onAscentDraftChange={app.setAscentDraft}
          onAscentSubmit={handleSubmit}
          onCancelEdit={leaveEditor}
          frenchGradeOptions={frenchGradeOptions}
        />
      ) : (
        <div>
          {app.ascents.length > 0 && !ascent ? (
            <>
              <p>Nie znaleziono wskazanego przejścia.</p>
              <Button variant="secondary" onClick={leaveEditor}>Wróć do raportów</Button>
            </>
          ) : "Wczytywanie przejścia..."}
        </div>
      )}
    </section>
  );
}