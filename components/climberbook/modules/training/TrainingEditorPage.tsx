"use client";

import { useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, EmotButton } from "@/components/climberbook/common/Button";
import { surfaceOptions } from "@/components/climberbook/common/constants";
import { useTrainingModule } from "@/components/climberbook/providers/ClimberbookProvider";
import { TrainingSessionForm } from "@/components/training-session/TrainingSessionForm";

type TrainingEditorPageProps =
  | { mode: "add"; date: string }
  | { mode: "edit"; trainingId: string };

export function TrainingEditorPage(props: TrainingEditorPageProps) {
  const app = useTrainingModule();
  const router = useRouter();
  const initializedKey = useRef<string | null>(null);
  const editingTraining =
    props.mode === "edit"
      ? app.trainings.find((training) => training.id === props.trainingId)
      : undefined;
  const date = props.mode === "add" ? props.date : editingTraining?.date ?? "";
  const initializationKey =
    props.mode === "add" ? `add:${props.date}` : `edit:${props.trainingId}`;

  useEffect(() => {
    if (initializedKey.current === initializationKey) return;

    if (props.mode === "add") {
      app.selectTrainingDate(props.date);
      initializedKey.current = initializationKey;
    } else if (editingTraining) {
      app.editTraining(editingTraining);
      initializedKey.current = initializationKey;
    }
  }, [app, editingTraining, initializationKey, props]);

  function leaveEditor() {
    app.resetTrainingSelection();
    router.replace("/trening");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const saved = await app.submitTraining(event);

    if (saved) {
      router.replace("/trening");
    }
  }

  const isReady =
    initializedKey.current === initializationKey &&
    (props.mode === "add" || editingTraining !== undefined);

  return (
    <section
      aria-labelledby="training-editor-title"
      style={{
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        minHeight: 0,
        height: "100%",
        background: "rgba(255, 250, 243, 0.96)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 12px",
          borderBottom: "1px solid var(--border-strong)",
        }}
      >
        <div>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.78rem" }}>
            Trening
          </p>
          <h1 id="training-editor-title" style={{ margin: "2px 0 0", fontSize: "1.2rem" }}>
            {props.mode === "edit" ? "Edytuj trening" : "Dodaj trening"}
          </h1>
        </div>
        <EmotButton
          type="button"
          variant="secondary"
          aria-label="Zamknij edycję treningu"
          onClick={leaveEditor}
          style={{ width: 36, height: 36, padding: 0, fontSize: "1.5rem" }}
        >
          ×
        </EmotButton>
      </header>

      {isReady ? (
        <div style={{ minHeight: 0, overflowY: "auto", padding: 12 }}>
          <TrainingSessionForm
            draft={app.trainingDraft}
            editingTraining={editingTraining}
            editingTrainingId={app.editingTrainingId}
            validationMessage={app.status}
            surfaceOptions={surfaceOptions}
            onDraftChange={app.setTrainingDraft}
            onToggleSurface={app.toggleSurface}
            onSubmit={handleSubmit}
            onResetSelection={leaveEditor}
            onDeleteTraining={app.deleteTraining}
          />
        </div>
      ) : (
        <div style={{ padding: 16 }}>
          {props.mode === "edit" ? "Wczytywanie treningu…" : "Przygotowywanie formularza…"}
          {props.mode === "edit" && app.trainings.length > 0 && !editingTraining && (
            <>
              <p>Nie znaleziono wskazanego treningu.</p>
              <Button variant="secondary" onClick={leaveEditor}>Wróć do pulpitu</Button>
            </>
          )}
        </div>
      )}
    </section>
  );
}