"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, EmotButton } from "@/components/climberbook/common/Button";
import { surfaceOptions } from "@/components/climberbook/common/constants";
import { useTrainingModule } from "@/components/climberbook/providers/ClimberbookProvider";
import { TrainingPreviewModal } from "@/components/training-session/TrainingPreviewModal";
import { TrainingSessionList } from "@/components/training-session/TrainingSessionCards";
import { TrainingSessionForm } from "@/components/training-session/TrainingSessionForm";

type TrainingEditorPageProps =
  | { mode: "add"; date: string }
  | { mode: "edit"; trainingId: string };

export function TrainingEditorPage(props: TrainingEditorPageProps) {
  const app = useTrainingModule();
  const router = useRouter();
  const initializedKey = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState<"form" | "dayTrainings">("form");
  const [previewTraining, setPreviewTraining] = useState<
    (typeof app.trainings)[number] | null
  >(null);
  const editingTraining =
    props.mode === "edit"
      ? app.trainings.find((training) => training.id === props.trainingId)
      : undefined;
  const date =
    props.mode === "add" ? props.date : (editingTraining?.date ?? "");
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

  useEffect(() => setActiveTab("form"), [initializationKey]);

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
  const selectedDate = app.trainingDraft.date || date;
  const selectedDayTrainings = app.trainings.filter(
    (training) => training.date === selectedDate,
  );

  return (
    <section
      aria-labelledby="training-editor-title"
      style={{
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        minHeight: 0,
        height: "100%",
        background: "var(--component-drawer-background)",
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
          <h1
            id="training-editor-title"
            style={{ margin: "2px 0 0", fontSize: "1.2rem" }}
          >
            {props.mode === "edit" ? "Edytuj trening" : "Dodaj trening"}
          </h1>
        </div>
        <EmotButton
          type="button"
          variant="secondary"
          aria-label="Zamknij edycję treningu"
          onClick={leaveEditor}
          style={{
            width: 36,
            height: 36,
            borderRadius: 0,
            padding: 0,
            fontSize: "1.5rem",
          }}
        >
          ×
        </EmotButton>
      </header>

      <div
        role="tablist"
        aria-label="Widok wybranego dnia"
        style={{
          display: "flex",
          gap: 16,
          padding: "0 12px",
          borderBottom: "1px solid var(--border-strong)",
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "form"}
          onClick={() => setActiveTab("form")}
          style={{
            border: 0,
            borderBottom:
              activeTab === "form"
                ? "2px solid var(--accent)"
                : "2px solid transparent",
            background: "transparent",
            color: activeTab === "form" ? "var(--text)" : "var(--muted)",
            font: "inherit",
            fontWeight: activeTab === "form" ? 700 : 500,
            padding: "9px 0 7px",
          }}
        >
          Trening
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "dayTrainings"}
          onClick={() => setActiveTab("dayTrainings")}
          style={{
            border: 0,
            borderBottom:
              activeTab === "dayTrainings"
                ? "2px solid var(--accent)"
                : "2px solid transparent",
            background: "transparent",
            color:
              activeTab === "dayTrainings" ? "var(--text)" : "var(--muted)",
            font: "inherit",
            fontWeight: activeTab === "dayTrainings" ? 700 : 500,
            padding: "9px 0 7px",
          }}
        >
          Treningi dnia ({selectedDayTrainings.length})
        </button>
      </div>

      {isReady ? (
        <div
          style={{
            minHeight: 0,
            overflowX: "hidden",
            overflowY: "auto",
            padding: 12,
          }}
        >
          {activeTab === "form" ? (
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
          ) : (
            <TrainingSessionList
              trainings={selectedDayTrainings}
              emptyMessage="Brak pozostałych treningów tego dnia."
              onEditTraining={(training) => {
                if (training.id) router.push(`/trening/edytuj/${training.id}`);
              }}
              onPreviewTraining={setPreviewTraining}
            />
          )}
        </div>
      ) : (
        <div style={{ padding: 16 }}>
          {props.mode === "edit"
            ? "Wczytywanie treningu…"
            : "Przygotowywanie formularza…"}
          {props.mode === "edit" &&
            app.trainings.length > 0 &&
            !editingTraining && (
              <>
                <p>Nie znaleziono wskazanego treningu.</p>
                <Button variant="secondary" onClick={leaveEditor}>
                  Wróć do pulpitu
                </Button>
              </>
            )}
        </div>
      )}
      {previewTraining ? (
        <TrainingPreviewModal
          training={previewTraining}
          surfaceOptions={surfaceOptions}
          onClose={() => setPreviewTraining(null)}
          onEditTraining={(training) => {
            setPreviewTraining(null);
            if (training.id) router.push(`/trening/edytuj/${training.id}`);
          }}
        />
      ) : null}
    </section>
  );
}
