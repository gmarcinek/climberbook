"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/climberbook/common/Button";
import { TextArea } from "@/components/climberbook/common/FormControls";
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

export function TrainingSessionForm({ draft, editingTraining, editingTrainingId, validationMessage, surfaceOptions, onDraftChange, onToggleSurface, onSubmit, onResetSelection, onDeleteTraining }: Props) {
  const { facilities } = useClimberbook();
  const combinedNotes = [draft.wellbeing, draft.notes].filter(Boolean).join("\n\n");
  return <form onSubmit={onSubmit} className={styles.trainingSidebar__form}>
    {validationMessage && <p className={styles.trainingSidebar__validationMessage}>{validationMessage}</p>}
    <TrainingSessionDetails draft={draft} surfaceOptions={surfaceOptions} facilities={facilities} onDraftChange={onDraftChange} onToggleSurface={onToggleSurface} />
    <TrainingProtocols draft={draft} onDraftChange={onDraftChange} />
    <TrainingGradeFields draft={draft} onDraftChange={onDraftChange} />
    <label className={styles.trainingSidebar__field}>
      <strong className={styles.trainingSidebar__protocolHeading}>Samopoczucie i notatki</strong>
      <TextArea value={combinedNotes} onChange={(event) => onDraftChange({ ...draft, wellbeing: "", notes: event.target.value })} rows={4} className={styles.trainingSidebar__input} />
    </label>
    <div className={styles.trainingSidebar__formActions}>
      <div className={styles.trainingSidebar__formPrimaryActions}>
        <Button type="submit">{editingTrainingId ? "Zapisz zmiany" : "Zapisz trening"}</Button>
        <Button variant="secondary" onClick={onResetSelection}>Anuluj</Button>
      </div>
      {editingTraining && <Button variant="quadrary" onClick={() => onDeleteTraining(editingTraining)} className={styles.trainingSidebar__formDeleteAction}>Usuń trening</Button>}
    </div>
  </form>;
}