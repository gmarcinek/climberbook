import { Button } from "@/components/climberbook/common/Button";
import { formatDurationMinutes } from "@/components/climberbook/common/training";
import { TrainingTimelineBar } from "@/components/training-calendar/TrainingTimelineBar";
import { summarizeTrainingType } from "@/components/training-calendar/training-calendar.helpers";
import type { TrainingRecord } from "@/lib/climbs-db";
import styles from "@/components/training-calendar/TrainingSidebar.module.css";
import { getGradeChipClassName, getTrainingGradeGroups, hasTrainingGradeContent } from "./training-session.utils";

export function TrainingGradeSummary({ training }: { training: TrainingRecord }) {
  const groups = getTrainingGradeGroups(training);
  if (!groups.length) return null;
  return <div className={styles.trainingSidebar__gradeSummary}>{groups.map(({ surface, grades }) => <div key={surface} className={styles.trainingSidebar__gradeSummaryGroup}><span className={styles.trainingSidebar__gradeSummaryLabel}>{surface === "lina" ? "Lina" : surface === "baldy" ? "Baldy" : surface === "moon" ? "Moon" : "Kilter"}</span><div className={styles.trainingSidebar__gradeSummaryChips}>{grades.map((grade, index) => <span key={`${surface}-${grade}-${index}`} className={[styles.trainingSidebar__gradeChip, styles.trainingSidebar__gradeSummaryChip, getGradeChipClassName(styles, surface, grade)].filter(Boolean).join(" ")}>{grade}</span>)}</div></div>)}</div>;
}

type CardProps = { training: TrainingRecord; showDate?: boolean; onEditTraining: (training: TrainingRecord) => void; onPreviewTraining: (training: TrainingRecord) => void };

export function TrainingSessionCard({ training, showDate, onEditTraining, onPreviewTraining }: CardProps) {
  return <article className={styles.trainingSidebar__trainingCard}>
    <div className={styles.trainingSidebar__trainingButtonHeader}><strong>{summarizeTrainingType(training)}</strong>{showDate && <span className={styles.trainingSidebar__pill}>{training.date}</span>}</div>
    <div className={styles.trainingSidebar__metaLine}><span>{training.time} · {formatDurationMinutes(training.durationMinutes)} · {training.bodyWeightKg} kg · Kalorie: {training.caloriesBurned}</span></div>
    <TrainingTimelineBar time={training.time} durationMinutes={training.durationMinutes} difficultyNotes={training.difficultyNotes} difficultyBySurface={training.difficultyBySurface} surfaces={training.surfaces} />
    {hasTrainingGradeContent(training) && <div className={styles.trainingSidebar__details}><TrainingGradeSummary training={training} /></div>}
    <div className={styles.trainingSidebar__cardActions}>
      <Button size="small" variant="secondary" onClick={() => onEditTraining(training)} className={styles.trainingSidebar__linkButton}>Edytuj</Button>
      <Button size="small" variant="secondary" onClick={() => onPreviewTraining(training)} className={styles.trainingSidebar__linkButton}>Podgląd</Button>
    </div>
  </article>;
}

type ListProps = { trainings: TrainingRecord[]; emptyMessage: string; showDate?: boolean; onEditTraining: (training: TrainingRecord) => void; onPreviewTraining: (training: TrainingRecord) => void };

export function TrainingSessionList({ trainings, emptyMessage, showDate, onEditTraining, onPreviewTraining }: ListProps) {
  return <div className={styles.trainingSidebar__stack}>
    {trainings.length === 0 && <p className={styles.trainingSidebar__helperText}>{emptyMessage}</p>}
    {trainings.map((training) => <TrainingSessionCard key={`${training.id ?? training.createdAt}-${training.time}`} training={training} showDate={showDate} onEditTraining={onEditTraining} onPreviewTraining={onPreviewTraining} />)}
  </div>;
}