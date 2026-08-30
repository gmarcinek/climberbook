import { useEffect, useState } from "react";
import { Download, Share2 } from "lucide-react";
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
import {
  formatHeartRateZoneRange,
  formatHeartRateZoneTime,
  heartRateZoneConfig,
} from "@/lib/heart-rate-zones";

type Props = {
  training: TrainingRecord;
  surfaceOptions: SurfaceOption[];
  onClose: () => void;
  onEditTraining: (training: TrainingRecord) => void;
};

async function createCachedShareJpeg(shareUrl: string) {
  const response = await fetch(`${shareUrl}/opengraph-image`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("share_image_generation_failed");
  const source = await createImageBitmap(await response.blob());
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  canvas.getContext("2d")?.drawImage(source, 0, 0);
  source.close();
  const jpeg = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("share_jpeg_failed"))),
      "image/jpeg",
      0.65,
    ),
  );
  const bytes = new Uint8Array(await jpeg.arrayBuffer());
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

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
  const [sharePreview, setSharePreview] = useState<{
    pageUrl: string;
    imageUrl: string;
  } | null>(null);
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
  const heartRateZoneValues =
    training.loadProfile?.heartRateZoneSeconds ??
    training.loadProfile?.heartRateZones;
  const usesLegacyHeartRatePercentages =
    !training.loadProfile?.heartRateZoneSeconds &&
    Boolean(training.loadProfile?.heartRateZones);
  const heartRateZones = heartRateZoneConfig
    .map((zone) => {
      const storedValue = Math.max(0, heartRateZoneValues?.[zone.key] ?? 0);
      const seconds = usesLegacyHeartRatePercentages
        ? Math.round((training.durationMinutes * 60 * storedValue) / 100)
        : storedValue;
      return { ...zone, seconds };
    })
    .filter((zone) => zone.seconds > 0);
  const heartRateZoneTotalSeconds = heartRateZones.reduce(
    (total, zone) => total + zone.seconds,
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
      const imageBase64 = await createCachedShareJpeg(shareUrl);
      const imageResponse = await fetch("/api/v1/training-shares", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shareId, imageBase64 }),
      });
      if (!imageResponse.ok) throw new Error("share_image_save_failed");
      await navigator.clipboard.writeText(shareUrl);
      setSharePreview({ pageUrl: shareUrl, imageUrl: `${shareUrl}/image` });
      setShareStatus("copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setShareStatus("idle");
        return;
      }
      setShareStatus("error");
    }
  }

  function exportTraining() {
    window.location.assign(
      `/api/v1/trainings/${encodeURIComponent(training.id)}/export`,
    );
  }

  return (
    <>
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
              <p className={styles.trainingSidebar__eyebrow}>
                Podgląd treningu
              </p>
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
            {heartRateZones.length > 0 ? (
              <PreviewDetail label="Strefy tętna" full>
                <div className={styles.trainingSidebar__previewHeartRateZones}>
                  {heartRateZones.map((zone) => (
                    <div
                      key={zone.key}
                      className={styles.trainingSidebar__previewHeartRateZone}
                    >
                      <div
                        className={
                          styles.trainingSidebar__previewHeartRateZoneHeader
                        }
                      >
                        <span>
                          <strong>{zone.label}</strong>
                          <small>
                            {formatHeartRateZoneRange(zone, training.ageYears)}
                          </small>
                        </span>
                        <b>{formatHeartRateZoneTime(zone.seconds)}</b>
                      </div>
                      <div
                        className={
                          styles.trainingSidebar__previewHeartRateZoneTrack
                        }
                        role="progressbar"
                        aria-label={`${zone.label}: ${formatHeartRateZoneTime(zone.seconds)}`}
                        aria-valuemin={0}
                        aria-valuemax={heartRateZoneTotalSeconds}
                        aria-valuenow={zone.seconds}
                      >
                        <span
                          style={{
                            backgroundColor: zone.color,
                            width: `${(zone.seconds / heartRateZoneTotalSeconds) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </PreviewDetail>
            ) : null}
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
          <div className={styles.trainingSidebar__drawerActions}>
            <div className={styles.trainingSidebar__drawerActionGroup}>
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
              <EmotButton
                size="small"
                variant="ghost"
                aria-label="Eksportuj trening"
                title="Eksportuj trening"
                onClick={exportTraining}
              >
                <Download size={17} aria-hidden="true" />
              </EmotButton>
            </div>
            <Button
              variant="tertiary"
              onClick={() => {
                onEditTraining(training);
                onClose();
              }}
              className={styles.trainingSidebar__drawerEditAction}
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
              Link do publicznego podglądu treningu został skopiowany do
              schowka.
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
      {sharePreview ? (
        <Modal
          labelledBy="share-preview-title"
          onClose={() => setSharePreview(null)}
          style={{
            width: "min(100% - 32px, 680px)",
            maxHeight: "90dvh",
            overflowY: "auto",
          }}
        >
          <div style={{ display: "grid", gap: "16px", padding: "4px" }}>
            <div>
              <p className={styles.trainingSidebar__eyebrow}>Udostępnianie</p>
              <h2 id="share-preview-title" style={{ margin: "4px 0 0" }}>
                Publiczny podgląd treningu
              </h2>
            </div>
            <img
              src={sharePreview.imageUrl}
              alt="Gotowy obraz udostępnienia treningu"
              style={{ display: "block", height: "auto", width: "100%" }}
            />
            <iframe
              title="Podgląd publicznej strony treningu"
              src={sharePreview.pageUrl}
              style={{
                border: "1px solid var(--border-strong)",
                height: "360px",
                width: "100%",
              }}
            />
            <a
              href={sharePreview.pageUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--accent)", overflowWrap: "anywhere" }}
            >
              {sharePreview.pageUrl}
            </a>
            <Button
              onClick={() =>
                void navigator.clipboard.writeText(sharePreview.pageUrl)
              }
            >
              Kopiuj link
            </Button>
          </div>
        </Modal>
      ) : null}
    </>
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
