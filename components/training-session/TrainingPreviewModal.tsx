import { Button } from "@/components/climberbook/common/Button";
import { Modal } from "@/components/climberbook/common/Modal";
import { ScrollPane } from "@/components/climberbook/common/ScrollPane";
import { RopeTrainingGradesChart } from "@/components/climberbook/common/charts";
import { formatDateLabel, summarizeTrainingType } from "@/components/training-calendar/training-calendar.helpers";
import type { TrainingRecord } from "@/lib/climbs-db";
import styles from "@/components/training-calendar/TrainingSidebar.module.css";
import type { SurfaceOption } from "./types";
import { formatReportedAttempts, formatSurfaces, getTrainingGradeGroups, splitDifficultyGrades } from "./training-session.utils";
import { TrainingGradeSummary } from "./TrainingSessionCards";

type Props = { training: TrainingRecord; surfaceOptions: SurfaceOption[]; onClose: () => void; onEditTraining: (training: TrainingRecord) => void };

export function TrainingPreviewModal({ training, surfaceOptions, onClose, onEditTraining }: Props) {
  const calories = Math.min(Math.max(training.caloriesBurned, 0), 1000);
  const hasChart = training.surfaces.includes("spraywall") || getTrainingGradeGroups(training).length > 0 || splitDifficultyGrades(training.difficultyNotes).length > 0;
  return <Modal labelledBy="training-preview-title" onClose={onClose} overlayStyle={{ display: "flex", justifyContent: "flex-end", padding: 0 }} style={{ width: "min(100%, 520px)", height: "100dvh", maxHeight: "100dvh", padding: 0, overflow: "hidden", background: "#fffdfa", boxShadow: "-18px 0 40px rgba(21, 34, 45, 0.2)" }}>
    <ScrollPane className={styles.trainingSidebar__drawerScroll} viewportClassName={styles.trainingSidebar__drawerViewport} contentClassName={styles.trainingSidebar__drawerContent} thumbColor="rgba(13, 107, 124, 0.3)" thumbHoverColor="rgba(13, 107, 124, 0.68)">
      <div className={styles.trainingSidebar__drawerHeader}><div><p className={styles.trainingSidebar__eyebrow}>Podgląd treningu</p><h2 id="training-preview-title" className={styles.trainingSidebar__drawerTitle}>{summarizeTrainingType(training)}</h2></div></div>
      <dl className={styles.trainingSidebar__previewDetails}>
        <PreviewDetail label="Data">{formatDateLabel(training.date)}</PreviewDetail><PreviewDetail label="Godzina">{training.time}</PreviewDetail><PreviewDetail label="Czas">{training.durationMinutes} min</PreviewDetail>
        <div className={styles.trainingSidebar__previewDetailsFull}><dt>Kalorie</dt><dd className={styles.trainingSidebar__caloriesValue}>{calories} / 1000 kcal</dd><div className={styles.trainingSidebar__caloriesProgress} role="progressbar" aria-label="Kalorie względem normy" aria-valuemin={0} aria-valuemax={1000} aria-valuenow={calories}><div className={styles.trainingSidebar__caloriesProgressFill} style={{ width: `${calories / 10}%` }} /></div></div>
        <PreviewDetail label="Masa ciała">{training.bodyWeightKg} kg</PreviewDetail><PreviewDetail label="Wiek">{training.ageYears} lat</PreviewDetail><PreviewDetail label="Wstawki">{formatReportedAttempts(training)}</PreviewDetail><PreviewDetail label="Rodzaj">{formatSurfaces(training, surfaceOptions) || "Brak"}</PreviewDetail>
        <div className={styles.trainingSidebar__previewDetailsFull}><dt>Aktywności</dt><dd><TrainingGradeSummary training={training} /></dd></div>
        {training.wellbeing && <PreviewDetail label="Samopoczucie" full>{training.wellbeing}</PreviewDetail>}{training.notes && <PreviewDetail label="Notatki" full>{training.notes}</PreviewDetail>}
      </dl>
      {hasChart && <section className={styles.trainingSidebar__previewCharts}><div className={styles.trainingSidebar__previewChartsHeader}><p className={styles.trainingSidebar__eyebrow}>Wykres sesji</p><h3 className={styles.trainingSidebar__previewChartsTitle}>Wyceny na sesję</h3></div><div className={styles.trainingSidebar__previewChart}><RopeTrainingGradesChart trainings={[training]} chartRange={{ start: training.date, end: training.date }} previewMode /></div></section>}
      <div className={styles.trainingSidebar__drawerActions}><Button variant="tertiary" onClick={() => { onEditTraining(training); onClose(); }} className={styles.trainingSidebar__submitButton}>Edytuj</Button></div>
    </ScrollPane>
  </Modal>;
}

function PreviewDetail({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? styles.trainingSidebar__previewDetailsFull : undefined}><dt>{label}</dt><dd>{children}</dd></div>;
}