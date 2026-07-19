"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/climberbook/common/Button";
import { ScrollPane } from "@/components/climberbook/common/ScrollPane";
import { TrainingPreviewModal as TrainingPreviewDrawer } from "@/components/training-session/TrainingPreviewModal";
import { TrainingSessionForm } from "@/components/training-session/TrainingSessionForm";
import { TrainingSessionList } from "@/components/training-session/TrainingSessionCards";
import type { SurfaceOption, TrainingDraftValues } from "@/components/training-session/types";
import { formatDateLabel } from "./training-calendar.helpers";
import type { TrainingRecord, TrainingSurface } from "@/lib/climbs-db";
import styles from "./TrainingSidebar.module.css";

export type { TrainingDraftValues } from "@/components/training-session/types";

type TrainingSidebarProps = {
  selectedDate: string | null;
  selectedDayTrainings: TrainingRecord[];
  visibleRangeTrainings: TrainingRecord[];
  today: string;
  trainingDraft: TrainingDraftValues;
  validationMessage?: string;
  editingTrainingId: string | null;
  surfaceOptions: SurfaceOption[];
  onTrainingDraftChange: (draft: TrainingDraftValues) => void;
  onToggleSurface: (surface: TrainingSurface) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSelectDate: (date: string) => void;
  onPreviewTraining: (training: TrainingRecord) => void;
  onEditTraining: (training: TrainingRecord) => void;
  onDeleteTraining: (training: TrainingRecord) => void;
  onResetSelection: () => void;
  onCancelEdit: () => void;
};

export function TrainingSidebar({
  selectedDate,
  selectedDayTrainings,
  visibleRangeTrainings,
  today,
  trainingDraft,
  validationMessage,
  editingTrainingId,
  surfaceOptions,
  onTrainingDraftChange,
  onToggleSurface,
  onSubmit,
  onSelectDate,
  onPreviewTraining,
  onEditTraining,
  onDeleteTraining,
  onResetSelection,
}: TrainingSidebarProps) {
  const [selectedDayTab, setSelectedDayTab] = useState<"trainings" | "form">(
    "form",
  );
  const isSelectionActive = selectedDate !== null;
  const editingTraining = selectedDayTrainings.find(
    (training) => training.id === editingTrainingId,
  );

  useEffect(() => setSelectedDayTab("form"), [selectedDate]);

  return (
    <aside style={{ height: "100%", minHeight: 0 }}>
      <ScrollPane
        style={{ height: "100%", minHeight: 0 }}
        viewportClassName={[
          styles.trainingSidebar,
          isSelectionActive
            ? styles["trainingSidebar--selected"]
            : styles["trainingSidebar--default"],
        ].join(" ")}
      >
        {isSelectionActive && selectedDate && (
          <>
            <section className={styles.trainingSidebar__panel}>
              <div className={styles.trainingSidebar__panelHeader}>
                <div>
                  <p className={styles.trainingSidebar__eyebrow}>Wybrany dzień</p>
                  <h1 id="training-form-modal-title" className={styles.trainingSidebar__title}>
                    {formatDateLabel(selectedDate)}
                  </h1>
                </div>
              </div>
              <div role="tablist" aria-label="Widok wybranego dnia" className={styles.trainingSidebar__dayTabs}>
                <DayTab active={selectedDayTab === "form"} onClick={() => setSelectedDayTab("form")}>
                  {editingTrainingId ? "Edytuj trening" : "Dodaj trening"}
                </DayTab>
                <DayTab active={selectedDayTab === "trainings"} onClick={() => setSelectedDayTab("trainings")}>
                  Treningi ({selectedDayTrainings.length})
                </DayTab>
              </div>
              {selectedDayTab === "trainings" && (
                <TrainingSessionList
                  trainings={selectedDayTrainings}
                  emptyMessage="Brak treningów dla tego dnia. Dodaj pierwszy wpis."
                  onEditTraining={(training) => {
                    onEditTraining(training);
                    setSelectedDayTab("form");
                  }}
                  onPreviewTraining={onPreviewTraining}
                />
              )}
            </section>
            {selectedDayTab === "form" && (
              <section className={styles.trainingSidebar__panel}>
                <TrainingSessionForm
                  draft={trainingDraft}
                  editingTraining={editingTraining}
                  editingTrainingId={editingTrainingId}
                  validationMessage={validationMessage}
                  surfaceOptions={surfaceOptions}
                  onDraftChange={onTrainingDraftChange}
                  onToggleSurface={onToggleSurface}
                  onSubmit={onSubmit}
                  onResetSelection={onResetSelection}
                  onDeleteTraining={onDeleteTraining}
                />
              </section>
            )}
          </>
        )}
        {!isSelectionActive && (
          <section className={`${styles.trainingSidebar__panel} ${styles["trainingSidebar__panel--filling"]}`}>
            <div className={styles.trainingSidebar__panelHeader}>
              <div>
                <p className={styles.trainingSidebar__eyebrow}>Widoczny okres</p>
                <h1 className={styles.trainingSidebar__title}>Lista treningów w kalendarzu</h1>
              </div>
              <div className={styles.trainingSidebar__headerActions}>
                <Button variant="tertiary" onClick={() => onSelectDate(today)} className={styles.trainingSidebar__submitButton}>
                  + Trening
                </Button>
              </div>
            </div>
            <div className={styles.trainingSidebar__visibleList}>
              <TrainingSessionList
                trainings={visibleRangeTrainings}
                emptyMessage="W wybranym zakresie jeszcze nie ma treningów."
                showDate
                onEditTraining={onEditTraining}
                onPreviewTraining={onPreviewTraining}
              />
            </div>
          </section>
        )}
      </ScrollPane>
    </aside>
  );
}

function DayTab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        styles.trainingSidebar__dayTab,
        active ? styles["trainingSidebar__dayTab--active"] : "",
      ].filter(Boolean).join(" ")}
    >
      {children}
    </button>
  );
}

export function TrainingPreviewModal(props: {
  training: TrainingRecord;
  surfaceOptions: Array<{ value: TrainingSurface; label: string }>;
  onClose: () => void;
  onEditTraining: (training: TrainingRecord) => void;
}) {
  return <TrainingPreviewDrawer {...props} />;
}
