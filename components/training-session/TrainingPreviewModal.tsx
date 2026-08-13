import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { Button, EmotButton } from "@/components/climberbook/common/Button";
import { Modal } from "@/components/climberbook/common/Modal";
import { ScrollPane } from "@/components/climberbook/common/ScrollPane";
import { RopeTrainingGradesChart } from "@/components/climberbook/common/charts";
import { formatDurationMinutes } from "@/components/climberbook/common/training";
import { useClimberbook } from "@/components/climberbook/providers/ClimberbookProvider";
import {
  getTrainingStimulusImpact,
  getTrainingStimulusScale,
} from "@/components/climberbook/modules/analytics/components/TrainingLoadModel";
import {
  formatDateLabel,
  summarizeTrainingType,
} from "@/components/training-calendar/training-calendar.helpers";
import type { TrainingRecord, TrainingSummaryRecord } from "@/lib/climbs-db";
import styles from "@/components/training-calendar/TrainingSidebar.module.css";
import type { SurfaceOption } from "./types";
import {
  formatReportedAttempts,
  formatSurfaces,
  getTrainingGradeGroups,
  splitDifficultyGrades,
} from "./training-session.utils";
import { TrainingGradeSummary } from "./TrainingSessionCards";
import { TrainingWeatherConditionMap } from "./TrainingSessionDetails";
import {
  getStimulusSharingLabel,
  readStimulusSharingConfig,
} from "@/lib/stimulus-sharing-config";

type Props = {
  training: TrainingRecord;
  surfaceOptions: SurfaceOption[];
  onClose: () => void;
  onEditTraining: (training: TrainingRecord) => void;
};

function TrainingSummaryBlock({ trainingId }: { trainingId: string }) {
  const [summary, setSummary] = useState<TrainingSummaryRecord | null>(null);

  useEffect(() => {
    let isCurrent = true;
    void fetch("/api/v1/insights")
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as {
          summaries: TrainingSummaryRecord[];
        };
      })
      .then((data) => {
        if (!isCurrent || !data) return;
        setSummary(
          data.summaries.find(
            (item) =>
              item.scope === "training" && item.trainingId === trainingId,
          ) ?? null,
        );
      });
    return () => {
      isCurrent = false;
    };
  }, [trainingId]);

  if (!summary) return null;
  return (
    <section className={styles.trainingSidebar__previewCharts}>
      <div className={styles.trainingSidebar__previewChartsHeader}>
        <p className={styles.trainingSidebar__eyebrow}>Podsumowanie</p>
        <h3 className={styles.trainingSidebar__previewChartsTitle}>
          {summary.content.title}
        </h3>
      </div>
      <p style={{ lineHeight: 1.55, margin: 0, whiteSpace: "pre-wrap" }}>
        {summary.content.text}
      </p>
    </section>
  );
}

export function TrainingPreviewModal({
  training,
  surfaceOptions,
  onClose,
  onEditTraining,
}: Props) {
  const { facilities, trainings } = useClimberbook();
  const [shareStatus, setShareStatus] = useState<
    "idle" | "sharing" | "shared" | "copied" | "downloaded" | "error"
  >("idle");
  const calories = Math.min(Math.max(training.caloriesBurned, 0), 1000);
  const hasChart =
    training.surfaces.includes("spraywall") ||
    getTrainingGradeGroups(training).length > 0 ||
    splitDifficultyGrades(training.difficultyNotes).length > 0;
  const stimulusImpact = getTrainingStimulusImpact(
    training,
    facilities,
    trainings,
  );
  const stimulusScale = getTrainingStimulusScale(
    training,
    trainings,
    facilities,
  );
  const stimulusDimensions = [
    [
      "Wytrzymałość tlenowa",
      stimulusImpact.dimensions.aerobicEndurance,
      "var(--component-chart-stimulus-aerobic)",
    ],
    [
      "Wytrzymałość siłowa",
      stimulusImpact.dimensions.strengthEndurance,
      "var(--component-chart-stimulus-strength-endurance)",
    ],
    [
      "Siła / moc",
      stimulusImpact.dimensions.strengthPower,
      "var(--component-chart-stimulus-strength-power)",
    ],
    [
      "Siła kontaktowa",
      stimulusImpact.dimensions.contactStrength,
      "var(--component-chart-stimulus-contact-strength)",
    ],
  ] as const;
  const totalStimulusDimensions = stimulusDimensions.reduce(
    (total, [, value]) => total + value,
    0,
  );

  async function shareTraining() {
    setShareStatus("sharing");
    try {
      const stimulusScale = getTrainingStimulusScale(
        training,
        trainings,
        facilities,
      );
      const sharingConfig = readStimulusSharingConfig();
      const response = await fetch("/api/v1/training-shares", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          trainingId: training.id,
          stimulusLabel: getStimulusSharingLabel(
            stimulusScale ? Math.round(stimulusScale.ratio * 100) : undefined,
            sharingConfig.labels,
          ),
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const shareId =
        payload &&
        typeof payload === "object" &&
        typeof (payload as { shareId?: unknown }).shareId === "string"
          ? (payload as { shareId: string }).shareId
          : null;
      if (!response.ok || !shareId)
        throw new Error("training_share_create_failed");

      const shareUrl = new URL(
        `/share/${shareId}`,
        window.location.origin,
      ).toString();
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus("copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setShareStatus("idle");
        return;
      }
      setShareStatus("error");
    }
  }

  return (
    <Modal
      labelledBy="training-preview-title"
      onClose={onClose}
      fullBleedMobile
      headerContent={
        <h2
          id="training-preview-title"
          className={styles.trainingSidebar__drawerTitle}
        >
          {formatDateLabel(training.date)} - {training.time}
        </h2>
      }
      overlayStyle={{
        display: "flex",
        justifyContent: "flex-end",
        padding: 0,
        background: "transparent",
      }}
      style={{
        width: "min(100%, 520px)",
        height: "100dvh",
        maxHeight: "100dvh",
        padding: 0,
        overflow: "hidden",
        background: "var(--component-training-preview-drawer-background)",
        boxShadow: "var(--component-training-preview-drawer-shadow)",
      }}
    >
      <ScrollPane
        className={styles.trainingSidebar__drawerScroll}
        viewportClassName={styles.trainingSidebar__drawerViewport}
        contentClassName={styles.trainingSidebar__drawerContent}
        thumbColor="rgba(13, 107, 124, 0.3)"
        thumbHoverColor="rgba(13, 107, 124, 0.68)"
      >
        <div className={styles.trainingSidebar__drawerHeader}>
          <div>
            <p className={styles.trainingSidebar__eyebrow}>Podgląd treningu</p>
            <h3 className={styles.trainingSidebar__drawerFacilityTitle}>
              {training.facilityName || "Nie wskazano"}
              {training.facilityVersion
                ? ` (v${training.facilityVersion})`
                : ""}
            </h3>
            <h4 className={styles.trainingSidebar__drawerTrainingType}>
              {summarizeTrainingType(training)}
            </h4>
          </div>
        </div>
        <dl className={styles.trainingSidebar__previewDetails}>
          <PreviewDetail label="Czas">
            {formatDurationMinutes(training.durationMinutes)}
          </PreviewDetail>
          <div className={styles.trainingSidebar__previewDetailsFull}>
            <dt>Kalorie</dt>
            <dd className={styles.trainingSidebar__caloriesValue}>
              {calories} / 1000 kcal
            </dd>
            <div
              className={styles.trainingSidebar__caloriesProgress}
              role="progressbar"
              aria-label="Kalorie względem normy"
              aria-valuemin={0}
              aria-valuemax={1000}
              aria-valuenow={calories}
            >
              <div
                className={styles.trainingSidebar__caloriesProgressFill}
                style={{ width: `${calories / 10}%` }}
              />
            </div>
          </div>
          <PreviewDetail label="Wiek">{training.ageYears} lat</PreviewDetail>
          <PreviewDetail label="Wstawki">
            {formatReportedAttempts(training)}
          </PreviewDetail>
          <PreviewDetail label="Impakt bodźca" full>
            <div style={{ display: "grid", gap: "4px" }}>
              {stimulusScale ? (
                <span
                  style={{
                    color: "var(--theme-beige, var(--theme-text-muted))",
                    fontSize: "12px",
                  }}
                >
                  {Math.round(stimulusScale.ratio * 100)}% średniej z{" "}
                  {stimulusScale.sessionsCount} sesji / 4 tyg.
                </span>
              ) : null}
              <div style={{ display: "grid", gap: "1rem", marginTop: "4px" }}>
                {stimulusDimensions.map(([label, value, color]) => {
                  const percent = totalStimulusDimensions
                    ? (value / totalStimulusDimensions) * 100
                    : 0;
                  const baselinePercent = stimulusScale
                    ? percent * stimulusScale.ratio
                    : null;
                  return (
                    <div key={label} style={{ display: "grid", gap: "3px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "8px",
                        }}
                      >
                        <span>{label}</span>
                        <span>
                          {Math.round(percent)}% /{" "}
                          <span
                            style={{
                              color:
                                "var(--theme-beige, var(--theme-text-muted))",
                              fontSize: "12px",
                            }}
                          >
                            {baselinePercent === null
                              ? "-"
                              : `${Math.round(baselinePercent)}%`}
                          </span>
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={`${label}: ${Math.round(percent)}% bodźca`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(percent)}
                        style={{
                          height: "10px",
                          overflow: "hidden",
                          background:
                            "var(--component-training-preview-stimulus-track, var(--theme-border-input))",
                        }}
                      >
                        <div
                          style={{
                            width: `${percent}%`,
                            height: "100%",
                            background: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </PreviewDetail>
          <div className={styles.trainingSidebar__previewDetailsFull}>
            <dt>Aktywności</dt>
            <dd>
              <TrainingGradeSummary training={training} />
            </dd>
          </div>
          {training.wellbeing && (
            <PreviewDetail label="Samopoczucie" full>
              {training.wellbeing}
            </PreviewDetail>
          )}
          {training.notes && (
            <PreviewDetail label="Notatki" full>
              {training.notes}
            </PreviewDetail>
          )}
        </dl>
        <TrainingSummaryBlock trainingId={training.id} />
        {training.weatherSnapshot ? (
          <section className={styles.trainingSidebar__previewCharts}>
            <div className={styles.trainingSidebar__previewChartsHeader}>
              <p className={styles.trainingSidebar__eyebrow}>Pogoda</p>
              <h3 className={styles.trainingSidebar__previewChartsTitle}>
                Warunki zewnętrzne
              </h3>
            </div>
            <dl className={styles.trainingSidebar__previewWeatherDetails}>
              {[
                [
                  "Temperatura",
                  `${training.weatherSnapshot.temperatureC.toFixed(1)}°C`,
                ],
                [
                  "Odczuwalna",
                  `${training.weatherSnapshot.apparentTemperatureC.toFixed(1)}°C`,
                ],
                [
                  "Wilgotność",
                  `${Math.round(training.weatherSnapshot.relativeHumidity)}%`,
                ],
                [
                  "Wiatr",
                  `${training.weatherSnapshot.windSpeedKmh.toFixed(1)} km/h`,
                ],
                [
                  "Opad",
                  `${training.weatherSnapshot.precipitationMm.toFixed(1)} mm`,
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <TrainingWeatherConditionMap weather={training.weatherSnapshot} />
          </section>
        ) : null}
        {hasChart && (
          <section className={styles.trainingSidebar__previewCharts}>
            <div className={styles.trainingSidebar__previewChartsHeader}>
              <p className={styles.trainingSidebar__eyebrow}>Wykres sesji</p>
              <h3 className={styles.trainingSidebar__previewChartsTitle}>
                Wyceny na sesję
              </h3>
            </div>
            <div className={styles.trainingSidebar__previewChart}>
              <RopeTrainingGradesChart
                trainings={[training]}
                chartRange={{ start: training.date, end: training.date }}
                previewMode
              />
            </div>
          </section>
        )}
        <div
          className={styles.trainingSidebar__drawerActions}
          style={{ justifyContent: "space-between" }}
        >
          <EmotButton
            size="small"
            variant="ghost"
            aria-label="Udostępnij trening"
            title="Udostępnij trening"
            onClick={() => void shareTraining()}
            disabled={shareStatus === "sharing"}
          >
            <Share2 size={17} aria-hidden="true" />
          </EmotButton>
          <Button
            variant="tertiary"
            onClick={() => {
              onEditTraining(training);
              onClose();
            }}
            className={styles.trainingSidebar__submitButton}
          >
            Edytuj
          </Button>
        </div>
        {shareStatus === "shared" ? (
          <p className={styles.trainingSidebar__notice}>
            Grafika treningu jest gotowa do udostępnienia.
          </p>
        ) : null}
        {shareStatus === "copied" ? (
          <p className={styles.trainingSidebar__notice}>
            Link do publicznego podglądu treningu został skopiowany do schowka.
          </p>
        ) : null}
        {shareStatus === "downloaded" ? (
          <p className={styles.trainingSidebar__notice}>
            Grafika treningu została pobrana jako plik PNG.
          </p>
        ) : null}
        {shareStatus === "error" ? (
          <p className={styles.trainingSidebar__notice}>
            Nie udało się przygotować grafiki do udostępnienia.
          </p>
        ) : null}
      </ScrollPane>
    </Modal>
  );
}

function PreviewDetail({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div
      className={full ? styles.trainingSidebar__previewDetailsFull : undefined}
    >
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
