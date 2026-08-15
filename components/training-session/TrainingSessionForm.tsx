"use client";

import { useState, type FormEvent } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/climberbook/common/Button";
import { TextArea } from "@/components/climberbook/common/FormControls";
import { FormActions } from "@/components/climberbook/common/FormLayout";
import { InformationModalTrigger } from "@/components/climberbook/common/InformationModal";
import { Modal } from "@/components/climberbook/common/Modal";
import type { TrainingRecord, TrainingSurface } from "@/lib/climbs-db";
import { useClimberbook } from "@/components/climberbook/providers/ClimberbookProvider";
import styles from "@/components/training-calendar/TrainingSidebar.module.css";
import { TrainingGradeFields } from "./TrainingGradeFields";
import { TrainingProtocols } from "./TrainingProtocols";
import { TrainingSessionDetails } from "./TrainingSessionDetails";
import type { SurfaceOption, TrainingDraftValues } from "./types";

type Props = {
  draft: TrainingDraftValues;
  editingTraining: TrainingRecord | undefined;
  editingTrainingId: string | null;
  validationMessage?: string;
  surfaceOptions: SurfaceOption[];
  onDraftChange: (draft: TrainingDraftValues) => void;
  onToggleSurface: (surface: TrainingSurface) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResetSelection: () => void;
  onDeleteTraining: (training: TrainingRecord) => void;
};

export function TrainingSessionForm({
  draft,
  editingTraining,
  editingTrainingId,
  validationMessage,
  surfaceOptions,
  onDraftChange,
  onToggleSurface,
  onSubmit,
  onResetSelection,
  onDeleteTraining,
}: Props) {
  const { facilities } = useClimberbook();
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] =
    useState(false);
  const combinedNotes = [draft.wellbeing, draft.notes]
    .filter(Boolean)
    .join("\n\n");

  function exportTraining(training: TrainingRecord) {
    window.location.assign(
      `/api/v1/trainings/${encodeURIComponent(training.id)}/export`,
    );
  }

  return (
    <form onSubmit={onSubmit} className={styles.trainingSidebar__form}>
      {validationMessage && (
        <p className={styles.trainingSidebar__validationMessage}>
          {validationMessage}
        </p>
      )}
      <TrainingSessionDetails
        draft={draft}
        surfaceOptions={surfaceOptions}
        facilities={facilities}
        onDraftChange={onDraftChange}
        onToggleSurface={onToggleSurface}
      />
      <TrainingProtocols draft={draft} onDraftChange={onDraftChange} />
      <TrainingGradeFields
        draft={draft}
        facilities={facilities}
        onDraftChange={onDraftChange}
      />
      <label className={styles.trainingSidebar__field}>
        <strong
          className={`${styles.trainingSidebar__protocolHeading} ${styles.trainingSidebar__headingWithInfo}`}
        >
          <span>Samopoczucie i notatki</span>
          <InformationModalTrigger topic="wellbeingAndNotes" />
        </strong>
        <TextArea
          value={combinedNotes}
          onChange={(event) =>
            onDraftChange({
              ...draft,
              wellbeing: "",
              notes: event.target.value,
            })
          }
          rows={4}
          className={styles.trainingSidebar__input}
        />
      </label>
      <FormActions layout="inline">
        <div className={styles.trainingSidebar__formPrimaryActions}>
          <Button type="submit">
            {editingTrainingId ? "Zapisz zmiany" : "Zapisz trening"}
          </Button>
          <Button
            variant="secondary"
            onClick={onResetSelection}
            className={styles.trainingSidebar__cancelAction}
          >
            Anuluj
          </Button>
          {editingTraining && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => exportTraining(editingTraining)}
            >
              <Download aria-hidden="true" size={16} strokeWidth={2} />
              Eksportuj trening
            </Button>
          )}
        </div>
        {editingTraining && (
          <Button
            variant="danger"
            onClick={() => setIsDeleteConfirmationOpen(true)}
            className={styles.trainingSidebar__formDeleteAction}
          >
            Usuń trening
          </Button>
        )}
      </FormActions>
      {isDeleteConfirmationOpen && editingTraining ? (
        <Modal
          labelledBy="training-delete-confirmation-title"
          onClose={() => setIsDeleteConfirmationOpen(false)}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.82rem" }}>
                Nieodwracalna akcja
              </p>
              <h2
                id="training-delete-confirmation-title"
                style={{ margin: "4px 0 0", fontSize: "1.2rem" }}
              >
                Usunąć trening?
              </h2>
            </div>
            <p style={{ margin: 0 }}>
              Tej operacji nie można cofnąć.
            </p>
            <FormActions layout="inline" marginTop="none">
              <Button
                variant="secondary"
                onClick={() => setIsDeleteConfirmationOpen(false)}
              >
                Anuluj
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setIsDeleteConfirmationOpen(false);
                  onDeleteTraining(editingTraining);
                }}
              >
                Usuń trening
              </Button>
            </FormActions>
          </div>
        </Modal>
      ) : null}
    </form>
  );
}
