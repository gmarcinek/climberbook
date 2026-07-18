import type {
  HangboardMode,
  SpraywallIntensity,
  TrainingRecord,
  TrainingSurface,
} from "@/lib/climbs-db";
import { FormEvent, useEffect, useState } from "react";
import {
  formControlClassNames,
  Input,
  InputActionControl,
  NumericRangeControl,
  NumericStepperControl,
  Select,
  TextArea,
} from "@/components/climberbook/common/FormControls";
import { formLayoutClassNames } from "@/components/climberbook/common/FormLayout";
import { Button } from "@/components/climberbook/common/Button";
import { Modal } from "@/components/climberbook/common/Modal";
import { ScrollPane } from "@/components/climberbook/common/ScrollPane";
import { RopeTrainingGradesChart } from "@/components/climberbook/common/charts";
import {
  formatDateLabel,
  summarizeTrainingType,
} from "./training-calendar.helpers";
import { TrainingTimelineBar } from "./TrainingTimelineBar";
import styles from "./TrainingSidebar.module.css";

const timeOptions = Array.from({ length: 24 * 4 }, (_value, index) => {
  const hour = String(Math.floor(index / 4)).padStart(2, "0");
  const minute = String((index % 4) * 15).padStart(2, "0");
  return `${hour}:${minute}`;
});

const gradeSurfaceLabels: Partial<Record<TrainingSurface, string>> = {
  lina: "Lina",
  baldy: "Baldy",
  moon: "Moon",
  kilter: "Kilter",
};
const ropeGradeBases = ["4", "5", "6", "7", "8", "9"];
const ropeGradeModifiers = ["a", "a+", "b", "b+", "c", "c+"];
const boulderGymGrades = Array.from({ length: 9 }, (_value, index) =>
  String(index + 1),
);
const boardGrades = Array.from(
  { length: 10 },
  (_value, index) => `V${index + 1}`,
);
const primarySurfaceOrder: TrainingSurface[] = [
  "lina",
  "baldy",
  "moon",
  "kilter",
  "spraywall",
];
const secondarySurfaceOrder: TrainingSurface[] = [
  "chwytotablica",
  "campus",
  "drazek",
];

function getSurfaceOptionsInOrder(
  surfaceOptions: Array<{ value: TrainingSurface; label: string }>,
  surfaceOrder: TrainingSurface[],
) {
  return surfaceOrder.flatMap((surface) => {
    const option = surfaceOptions.find((item) => item.value === surface);
    return option ? [option] : [];
  });
}

function normalizeDecimalInput(value: string) {
  return value.replaceAll(",", ".");
}

function formatWeightToSingleDecimal(value: string) {
  const normalizedValue = normalizeDecimalInput(value);

  if (!normalizedValue) {
    return "";
  }

  const parsedValue = Number(normalizedValue);

  if (Number.isNaN(parsedValue)) {
    return value;
  }

  return parsedValue.toFixed(1);
}

function splitDifficultyGrades(value: string) {
  return value
    .split(",")
    .map((grade) => grade.trim())
    .filter(Boolean);
}

export type TrainingDraftValues = {
  date: string;
  time: string;
  durationMinutes: string;
  bodyWeightKg: string;
  ageYears: string;
  caloriesBurned: string;
  caloriesMode: "auto" | "manual";
  difficultyNotes: string;
  difficultyBySurface: Partial<Record<TrainingSurface, string>>;
  protocol: {
    pullUp: Array<{
      sets: string;
      repetitions: string;
      isOneRepMax: "tak" | "nie";
      loadDeloadKg: string;
    }>;
    hangboard: Array<{
      sets: string;
      mode: HangboardMode;
      usesRpm: "tak" | "nie";
      hangSeconds: string;
      restSeconds: string;
      repetitions: string;
      loadDeloadKg: string;
      edgeDepthMm: string;
    }>;
    spraywallIntensity: SpraywallIntensity;
  };
  wellbeing: string;
  surfaces: TrainingSurface[];
  customSessionType: string;
  notes: string;
};

function adjustWeightValue(value: string, delta: number) {
  const normalizedValue = normalizeDecimalInput(value || "0");
  const parsedValue = Number(normalizedValue);
  const nextValue = Math.max(
    0,
    (Number.isNaN(parsedValue) ? 0 : parsedValue) + delta,
  );

  return nextValue.toFixed(1);
}

function adjustCaloriesValue(value: string, delta: number) {
  const parsedValue = Number(value);
  const nextValue = Math.max(
    0,
    (Number.isNaN(parsedValue) ? 0 : parsedValue) + delta,
  );

  return String(nextValue);
}

function adjustSeriesValue(value: string, delta: number) {
  const parsedValue = Number(value);
  const nextValue = Math.max(
    1,
    Math.trunc(Number.isNaN(parsedValue) ? 1 : parsedValue) + delta,
  );

  return String(nextValue);
}

function adjustLoadDeloadValue(value: string, delta: number) {
  const parsedValue = Number(value);
  const nextValue = Math.min(
    200,
    Math.max(-200, (Number.isNaN(parsedValue) ? 0 : parsedValue) + delta),
  );

  return String(nextValue);
}

function adjustEdgeDepthValue(value: string, delta: number) {
  const parsedValue = Number(value);
  const nextValue = Math.max(
    1,
    Math.trunc(Number.isNaN(parsedValue) ? 1 : parsedValue) + delta,
  );

  return String(nextValue);
}

type TrainingSidebarProps = {
  selectedDate: string | null;
  selectedDayTrainings: TrainingRecord[];
  visibleRangeTrainings: TrainingRecord[];
  today: string;
  trainingDraft: TrainingDraftValues;
  validationMessage?: string;
  editingTrainingId: number | null;
  surfaceOptions: Array<{ value: TrainingSurface; label: string }>;
  onTrainingDraftChange: (draft: TrainingDraftValues) => void;
  onToggleSurface: (surface: TrainingSurface) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSelectDate: (date: string) => void;
  onEditTraining: (training: TrainingRecord) => void;
  onDeleteTraining: (training: TrainingRecord) => void;
  requestedPreviewTraining: TrainingRecord | null;
  onRequestedPreviewClose: () => void;
  onResetSelection: () => void;
  onCancelEdit: () => void;
};

export function TrainingSidebar(props: TrainingSidebarProps) {
  const {
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
    onEditTraining,
    onDeleteTraining,
    requestedPreviewTraining,
    onRequestedPreviewClose,
    onResetSelection,
    onCancelEdit,
  } = props;

  const isSelectionActive = selectedDate !== null;
  const sidebarClassName = [
    styles.trainingSidebar,
    isSelectionActive
      ? styles["trainingSidebar--selected"]
      : styles["trainingSidebar--default"],
  ].join(" ");
  const summaryPanelClassName = [
    styles.trainingSidebar__panel,
    isSelectionActive ? styles["trainingSidebar__panel--filling"] : "",
  ]
    .filter(Boolean)
    .join(" ");
  const fullFieldClassName = [
    styles.trainingSidebar__field,
    formLayoutClassNames.fullSpan,
  ].join(" ");
  const protocolHeadingClassName = [
    fullFieldClassName,
    styles.trainingSidebar__protocolHeading,
  ].join(" ");
  const [expandedGradeSurface, setExpandedGradeSurface] =
    useState<TrainingSurface | null>(null);
  const [selectedRopeGradeBase, setSelectedRopeGradeBase] = useState<
    string | null
  >(null);
  const [selectedDayTab, setSelectedDayTab] = useState<"trainings" | "form">(
    "form",
  );
  const [isCustomSessionExpanded, setIsCustomSessionExpanded] = useState(false);
  const [previewedTraining, setPreviewedTraining] =
    useState<TrainingRecord | null>(null);
  const editingTraining = selectedDayTrainings.find(
    (training) => training.id === editingTrainingId,
  );
  useEffect(() => {
    setSelectedDayTab("form");
  }, [selectedDate]);
  useEffect(() => {
    if (requestedPreviewTraining) {
      setPreviewedTraining(requestedPreviewTraining);
    }
  }, [requestedPreviewTraining]);
  function closePreview() {
    setPreviewedTraining(null);
    onRequestedPreviewClose();
  }
  const gradeSurfaces = trainingDraft.surfaces.filter(
    (surface) => gradeSurfaceLabels[surface],
  );
  const primarySurfaceOptions = getSurfaceOptionsInOrder(
    surfaceOptions,
    primarySurfaceOrder,
  );
  const secondarySurfaceOptions = getSurfaceOptionsInOrder(
    surfaceOptions,
    secondarySurfaceOrder,
  );
  const orderedSurfaceValues = new Set([
    ...primarySurfaceOrder,
    ...secondarySurfaceOrder,
  ]);
  const remainingSurfaceOptions = surfaceOptions.filter(
    (option) => !orderedSurfaceValues.has(option.value),
  );
  const combinedNotes = [trainingDraft.wellbeing, trainingDraft.notes]
    .filter(Boolean)
    .join("\n\n");
  const previewCalories = previewedTraining
    ? Math.min(Math.max(previewedTraining.caloriesBurned, 0), 1000)
    : 0;

  function formatSurfaces(training: TrainingRecord) {
    return [
      ...training.surfaces.map(
        (surface) =>
          surfaceOptions.find((option) => option.value === surface)?.label ??
          surface,
      ),
      training.customSessionType?.trim() || "",
    ]
      .filter(Boolean)
      .join(", ");
  }

  function renderSurfaceOptions(
    options: Array<{ value: TrainingSurface; label: string }>,
  ) {
    return options.map((option) => {
      const active = trainingDraft.surfaces.includes(option.value);
      const chipClassName = [
        styles.trainingSidebar__chip,
        styles.trainingSidebar__sessionChip,
        active ? styles["trainingSidebar__chip--active"] : "",
      ]
        .filter(Boolean)
        .join(" ");

      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onToggleSurface(option.value)}
          className={chipClassName}
        >
          {option.label}
        </button>
      );
    });
  }

  return (
    <aside style={{ height: "100%", minHeight: 0 }}>
      <ScrollPane
        style={{ height: "100%", minHeight: 0 }}
        viewportClassName={sidebarClassName}
      >
        {isSelectionActive && selectedDate && (
          <section className={styles.trainingSidebar__panel}>
            <div className={styles.trainingSidebar__panelHeader}>
              <div>
                <p className={styles.trainingSidebar__eyebrow}>Wybrany dzień</p>
                <h1
                  id="training-form-modal-title"
                  className={styles.trainingSidebar__title}
                >
                  {formatDateLabel(selectedDate)}
                </h1>
              </div>
            </div>

            <div
              role="tablist"
              aria-label="Widok wybranego dnia"
              className={styles.trainingSidebar__dayTabs}
            >
              <button
                type="button"
                role="tab"
                aria-selected={selectedDayTab === "form"}
                onClick={() => setSelectedDayTab("form")}
                className={[
                  styles.trainingSidebar__dayTab,
                  selectedDayTab === "form"
                    ? styles["trainingSidebar__dayTab--active"]
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {editingTrainingId ? "Edytuj trening" : "Dodaj trening"}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={selectedDayTab === "trainings"}
                onClick={() => setSelectedDayTab("trainings")}
                className={[
                  styles.trainingSidebar__dayTab,
                  selectedDayTab === "trainings"
                    ? styles["trainingSidebar__dayTab--active"]
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                Treningi ({selectedDayTrainings.length})
              </button>
            </div>

            {selectedDayTab === "trainings" && (
              <div className={styles.trainingSidebar__stack}>
                {selectedDayTrainings.length === 0 && (
                  <p className={styles.trainingSidebar__helperText}>
                    Brak treningów dla tego dnia. Dodaj pierwszy wpis.
                  </p>
                )}
                {selectedDayTrainings.map((training) => (
                  <article
                    key={training.id}
                    className={styles.trainingSidebar__trainingCard}
                  >
                    <div
                      className={styles.trainingSidebar__trainingButtonHeader}
                    >
                      <strong>{summarizeTrainingType(training)}</strong>
                    </div>
                    <TrainingTimelineBar
                      time={training.time}
                      durationMinutes={training.durationMinutes}
                      difficultyNotes={training.difficultyNotes}
                      difficultyBySurface={training.difficultyBySurface}
                      surfaces={training.surfaces}
                    />
                    <div className={styles.trainingSidebar__metaLine}>
                      <span>
                        {training.time} · {training.durationMinutes} min ·{" "}
                        {training.bodyWeightKg} kg · Kalorie:{" "}
                        {training.caloriesBurned}
                      </span>
                    </div>
                    {training.difficultyNotes?.trim() ? (
                      <div className={styles.trainingSidebar__details}>
                        <span>Wyceny: {training.difficultyNotes}</span>
                      </div>
                    ) : null}
                    <div className={styles.trainingSidebar__cardActions}>
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={() => {
                          onEditTraining(training);
                          setSelectedDayTab("form");
                        }}
                        className={styles.trainingSidebar__linkButton}
                      >
                        Edytuj
                      </Button>
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={() => setPreviewedTraining(training)}
                        className={styles.trainingSidebar__linkButton}
                      >
                        Podgląd
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {isSelectionActive && selectedDayTab === "form" && (
          <section className={styles.trainingSidebar__panel}>
            <form onSubmit={onSubmit} className={styles.trainingSidebar__form}>
              {validationMessage ? (
                <p className={styles.trainingSidebar__validationMessage}>
                  {validationMessage}
                </p>
              ) : null}
              <div
                className={`${styles.trainingSidebar__stack} ${styles.trainingSidebar__formSectionStack}`}
              >
                <div className={styles.trainingSidebar__stack}>
                  <strong className={styles.trainingSidebar__protocolHeading}>
                    Rodzaj sesji
                  </strong>
                  <div className={styles.trainingSidebar__chipGrid}>
                    {renderSurfaceOptions(primarySurfaceOptions)}
                  </div>
                  <div className={styles.trainingSidebar__chipGrid}>
                    {renderSurfaceOptions(secondarySurfaceOptions)}
                  </div>
                  <div className={styles.trainingSidebar__chipGrid}>
                    {renderSurfaceOptions(remainingSurfaceOptions)}
                    <button
                      type="button"
                      aria-expanded={
                        isCustomSessionExpanded ||
                        Boolean(trainingDraft.customSessionType)
                      }
                      onClick={() =>
                        setIsCustomSessionExpanded((isExpanded) => !isExpanded)
                      }
                      className={[
                        styles.trainingSidebar__chip,
                        styles.trainingSidebar__sessionChip,
                        isCustomSessionExpanded ||
                        trainingDraft.customSessionType
                          ? styles["trainingSidebar__chip--active"]
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      + Inne
                    </button>
                  </div>
                  {(isCustomSessionExpanded ||
                    trainingDraft.customSessionType) && (
                    <label className={styles.trainingSidebar__field}>
                      Inne
                      <Input
                        value={trainingDraft.customSessionType}
                        onChange={(event) =>
                          onTrainingDraftChange({
                            ...trainingDraft,
                            customSessionType: event.target.value,
                          })
                        }
                        placeholder="Np. mobility, joga, regeneracja"
                        className={styles.trainingSidebar__input}
                      />
                    </label>
                  )}
                </div>
                <div className={styles.trainingSidebar__stack}>
                  <div className={styles.trainingSidebar__formGrid}>
                    <label className={styles.trainingSidebar__field}>
                      Data
                      <Input
                        value={trainingDraft.date}
                        onChange={(event) =>
                          onTrainingDraftChange({
                            ...trainingDraft,
                            date: event.target.value,
                          })
                        }
                        type="date"
                        required
                        className={styles.trainingSidebar__input}
                      />
                    </label>
                    <label className={styles.trainingSidebar__field}>
                      Godzina
                      <Select
                        value={trainingDraft.time}
                        onChange={(event) =>
                          onTrainingDraftChange({
                            ...trainingDraft,
                            time: event.target.value,
                          })
                        }
                        required
                        className={styles.trainingSidebar__input}
                      >
                        {timeOptions.map((timeOption) => (
                          <option key={timeOption} value={timeOption}>
                            {timeOption}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className={styles.trainingSidebar__field}>
                      Czas (min)
                      <NumericRangeControl
                        value={trainingDraft.durationMinutes}
                        onChange={(event) =>
                          onTrainingDraftChange({
                            ...trainingDraft,
                            durationMinutes: event.target.value,
                          })
                        }
                        min="15"
                        max="300"
                        step="15"
                        ariaLabel="Długość treningu w minutach"
                        valueLabel={`${trainingDraft.durationMinutes} min`}
                        className={styles.trainingSidebar__durationControl}
                      />
                    </label>
                    <label className={styles.trainingSidebar__field}>
                      Kalorie
                      <NumericStepperControl
                        value={trainingDraft.caloriesBurned}
                        onChange={(event) =>
                          onTrainingDraftChange({
                            ...trainingDraft,
                            caloriesBurned: event.target.value,
                            caloriesMode: "manual",
                          })
                        }
                        onDecrement={() =>
                          onTrainingDraftChange({
                            ...trainingDraft,
                            caloriesBurned: adjustCaloriesValue(
                              trainingDraft.caloriesBurned,
                              -100,
                            ),
                            caloriesMode: "manual",
                          })
                        }
                        onIncrement={() =>
                          onTrainingDraftChange({
                            ...trainingDraft,
                            caloriesBurned: adjustCaloriesValue(
                              trainingDraft.caloriesBurned,
                              100,
                            ),
                            caloriesMode: "manual",
                          })
                        }
                        decrementAriaLabel="Odejmij 100 kalorii"
                        incrementAriaLabel="Dodaj 100 kalorii"
                        decrementTitle="Odejmij 100 kalorii"
                        incrementTitle="Dodaj 100 kalorii"
                        trailingActions={
                          <button
                            type="button"
                            onClick={() =>
                              onTrainingDraftChange({
                                ...trainingDraft,
                                caloriesBurned: "",
                                caloriesMode: "auto",
                              })
                            }
                            className={formControlClassNames.stepButton}
                          >
                            Auto
                          </button>
                        }
                        inputProps={{
                          placeholder: "Auto z wagi, wieku i czasu",
                          type: "number",
                        }}
                        className={styles.trainingSidebar__controlGroup}
                      />
                    </label>
                  </div>
                </div>
              </div>
              {(trainingDraft.surfaces.includes("drazek") ||
                trainingDraft.surfaces.includes("chwytotablica") ||
                trainingDraft.surfaces.includes("spraywall")) && (
                <div className={styles.trainingSidebar__protocolStacks}>
                  {trainingDraft.surfaces.includes("drazek") && (
                    <div className={styles.trainingSidebar__protocolStack}>
                      <strong className={protocolHeadingClassName}>
                        Protokół - Drążek
                      </strong>
                      {trainingDraft.protocol.pullUp.map(
                        (protocolSet, index) => (
                          <div
                            key={`pull-up-${index}`}
                            className={styles.trainingSidebar__protocolSeries}
                          >
                            <strong className={fullFieldClassName}>
                              Seria {String.fromCharCode(65 + index)}
                            </strong>
                            <label
                              className={`${styles.trainingSidebar__field} ${styles.trainingSidebar__pullUpSets}`}
                            >
                              Ilość takich serii
                              <NumericStepperControl
                                value={protocolSet.sets}
                                onChange={(event) =>
                                  onTrainingDraftChange({
                                    ...trainingDraft,
                                    protocol: {
                                      ...trainingDraft.protocol,
                                      pullUp: trainingDraft.protocol.pullUp.map(
                                        (item, itemIndex) =>
                                          itemIndex === index
                                            ? {
                                                ...item,
                                                sets: event.target.value,
                                              }
                                            : item,
                                      ),
                                    },
                                  })
                                }
                                onDecrement={() =>
                                  onTrainingDraftChange({
                                    ...trainingDraft,
                                    protocol: {
                                      ...trainingDraft.protocol,
                                      pullUp: trainingDraft.protocol.pullUp.map(
                                        (item, itemIndex) =>
                                          itemIndex === index
                                            ? {
                                                ...item,
                                                sets: adjustSeriesValue(
                                                  item.sets,
                                                  -1,
                                                ),
                                              }
                                            : item,
                                      ),
                                    },
                                  })
                                }
                                onIncrement={() =>
                                  onTrainingDraftChange({
                                    ...trainingDraft,
                                    protocol: {
                                      ...trainingDraft.protocol,
                                      pullUp: trainingDraft.protocol.pullUp.map(
                                        (item, itemIndex) =>
                                          itemIndex === index
                                            ? {
                                                ...item,
                                                sets: adjustSeriesValue(
                                                  item.sets,
                                                  1,
                                                ),
                                              }
                                            : item,
                                      ),
                                    },
                                  })
                                }
                                decrementAriaLabel={`Odejmij serię ${String.fromCharCode(65 + index)}`}
                                incrementAriaLabel={`Dodaj serię ${String.fromCharCode(65 + index)}`}
                                inputProps={{
                                  type: "number",
                                  min: "1",
                                  step: "1",
                                }}
                                className={styles.trainingSidebar__controlGroup}
                              />
                            </label>
                            <label
                              className={`${styles.trainingSidebar__field} ${styles.trainingSidebar__pullUpRepetitions}`}
                            >
                              Powtórzenia w serii
                              <NumericStepperControl
                                value={protocolSet.repetitions}
                                onChange={(event) =>
                                  onTrainingDraftChange({
                                    ...trainingDraft,
                                    protocol: {
                                      ...trainingDraft.protocol,
                                      pullUp: trainingDraft.protocol.pullUp.map(
                                        (item, itemIndex) =>
                                          itemIndex === index
                                            ? {
                                                ...item,
                                                repetitions: event.target.value,
                                              }
                                            : item,
                                      ),
                                    },
                                  })
                                }
                                onDecrement={() =>
                                  onTrainingDraftChange({
                                    ...trainingDraft,
                                    protocol: {
                                      ...trainingDraft.protocol,
                                      pullUp: trainingDraft.protocol.pullUp.map(
                                        (item, itemIndex) =>
                                          itemIndex === index
                                            ? {
                                                ...item,
                                                repetitions: adjustSeriesValue(
                                                  item.repetitions,
                                                  -1,
                                                ),
                                              }
                                            : item,
                                      ),
                                    },
                                  })
                                }
                                onIncrement={() =>
                                  onTrainingDraftChange({
                                    ...trainingDraft,
                                    protocol: {
                                      ...trainingDraft.protocol,
                                      pullUp: trainingDraft.protocol.pullUp.map(
                                        (item, itemIndex) =>
                                          itemIndex === index
                                            ? {
                                                ...item,
                                                repetitions: adjustSeriesValue(
                                                  item.repetitions,
                                                  1,
                                                ),
                                              }
                                            : item,
                                      ),
                                    },
                                  })
                                }
                                decrementAriaLabel={`Odejmij powtórzenie w serii ${String.fromCharCode(65 + index)} drążka`}
                                incrementAriaLabel={`Dodaj powtórzenie w serii ${String.fromCharCode(65 + index)} drążka`}
                                inputProps={{
                                  type: "number",
                                  min: "1",
                                  step: "1",
                                }}
                                className={styles.trainingSidebar__controlGroup}
                              />
                            </label>
                            <label
                              className={`${styles.trainingSidebar__field} ${styles.trainingSidebar__pullUpOneRepMax}`}
                            >
                              Maks. 1 powtórzenie
                              <Select
                                value={protocolSet.isOneRepMax}
                                onChange={(event) =>
                                  onTrainingDraftChange({
                                    ...trainingDraft,
                                    protocol: {
                                      ...trainingDraft.protocol,
                                      pullUp: trainingDraft.protocol.pullUp.map(
                                        (item, itemIndex) =>
                                          itemIndex === index
                                            ? {
                                                ...item,
                                                isOneRepMax: event.target
                                                  .value as "tak" | "nie",
                                              }
                                            : item,
                                      ),
                                    },
                                  })
                                }
                                className={styles.trainingSidebar__input}
                              >
                                <option value="nie">Nie</option>
                                <option value="tak">Tak</option>
                              </Select>
                            </label>
                            <label
                              className={`${styles.trainingSidebar__field} ${styles.trainingSidebar__pullUpLoad}`}
                            >
                              Load / deload (kg)
                              <NumericStepperControl
                                value={protocolSet.loadDeloadKg}
                                onChange={(event) =>
                                  onTrainingDraftChange({
                                    ...trainingDraft,
                                    protocol: {
                                      ...trainingDraft.protocol,
                                      pullUp: trainingDraft.protocol.pullUp.map(
                                        (item, itemIndex) =>
                                          itemIndex === index
                                            ? {
                                                ...item,
                                                loadDeloadKg:
                                                  event.target.value,
                                              }
                                            : item,
                                      ),
                                    },
                                  })
                                }
                                onDecrement={() =>
                                  onTrainingDraftChange({
                                    ...trainingDraft,
                                    protocol: {
                                      ...trainingDraft.protocol,
                                      pullUp: trainingDraft.protocol.pullUp.map(
                                        (item, itemIndex) =>
                                          itemIndex === index
                                            ? {
                                                ...item,
                                                loadDeloadKg:
                                                  adjustLoadDeloadValue(
                                                    item.loadDeloadKg,
                                                    -1,
                                                  ),
                                              }
                                            : item,
                                      ),
                                    },
                                  })
                                }
                                onIncrement={() =>
                                  onTrainingDraftChange({
                                    ...trainingDraft,
                                    protocol: {
                                      ...trainingDraft.protocol,
                                      pullUp: trainingDraft.protocol.pullUp.map(
                                        (item, itemIndex) =>
                                          itemIndex === index
                                            ? {
                                                ...item,
                                                loadDeloadKg:
                                                  adjustLoadDeloadValue(
                                                    item.loadDeloadKg,
                                                    1,
                                                  ),
                                              }
                                            : item,
                                      ),
                                    },
                                  })
                                }
                                decrementAriaLabel={`Odejmij 1 kg w serii ${String.fromCharCode(65 + index)} drążka`}
                                incrementAriaLabel={`Dodaj 1 kg w serii ${String.fromCharCode(65 + index)} drążka`}
                                inputProps={{
                                  type: "number",
                                  min: "-200",
                                  max: "200",
                                  step: "1",
                                }}
                                inputSuffix="kg"
                                className={styles.trainingSidebar__input}
                              />
                            </label>
                            {trainingDraft.protocol.pullUp.length > 1 && (
                              <button
                                type="button"
                                aria-label={`Usuń serię ${String.fromCharCode(65 + index)} drążka`}
                                onClick={() =>
                                  onTrainingDraftChange({
                                    ...trainingDraft,
                                    protocol: {
                                      ...trainingDraft.protocol,
                                      pullUp:
                                        trainingDraft.protocol.pullUp.filter(
                                          (_item, itemIndex) =>
                                            itemIndex !== index,
                                        ),
                                    },
                                  })
                                }
                                className={
                                  styles.trainingSidebar__protocolRemoveButton
                                }
                              >
                                Usuń serię
                              </button>
                            )}
                          </div>
                        ),
                      )}
                      <button
                        type="button"
                        aria-label="Dodaj serię drążka"
                        title="Dodaj serię"
                        onClick={() =>
                          onTrainingDraftChange({
                            ...trainingDraft,
                            protocol: {
                              ...trainingDraft.protocol,
                              pullUp: [
                                ...trainingDraft.protocol.pullUp,
                                {
                                  sets: "1",
                                  repetitions: "1",
                                  isOneRepMax: "nie",
                                  loadDeloadKg: "0",
                                },
                              ],
                            },
                          })
                        }
                        className={styles.trainingSidebar__protocolAddButton}
                      >
                        + Seria
                      </button>
                    </div>
                  )}
                  {trainingDraft.surfaces.includes("chwytotablica") && (
                    <div className={styles.trainingSidebar__protocolStack}>
                      <strong className={protocolHeadingClassName}>
                        Protokół - Chwytotablica
                      </strong>
                      {trainingDraft.protocol.hangboard.map(
                        (protocolSet, index) => (
                          <div
                            key={`hangboard-${index}`}
                            className={styles.trainingSidebar__protocolSeries}
                          >
                            <strong className={fullFieldClassName}>
                              Seria {String.fromCharCode(65 + index)}
                            </strong>
                            <div
                              className={
                                styles.trainingSidebar__hangboardModeTabs
                              }
                              role="tablist"
                              aria-label={`Tryb serii ${String.fromCharCode(65 + index)} chwytotablicy`}
                            >
                              {(
                                [
                                  ["hangs", "Zwisy"],
                                  ["intervals", "Interwały"],
                                ] as const
                              ).map(([mode, label]) => (
                                <button
                                  key={mode}
                                  type="button"
                                  role="tab"
                                  aria-selected={protocolSet.mode === mode}
                                  className={`${styles.trainingSidebar__hangboardModeTab} ${
                                    protocolSet.mode === mode
                                      ? styles[
                                          "trainingSidebar__hangboardModeTab--active"
                                        ]
                                      : ""
                                  }`}
                                  onClick={() =>
                                    onTrainingDraftChange({
                                      ...trainingDraft,
                                      protocol: {
                                        ...trainingDraft.protocol,
                                        hangboard:
                                          trainingDraft.protocol.hangboard.map(
                                            (item, itemIndex) =>
                                              itemIndex === index
                                                ? { ...item, mode }
                                                : item,
                                          ),
                                      },
                                    })
                                  }
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                            <label className={styles.trainingSidebar__field}>
                              Ilość serii
                              <NumericStepperControl
                                value={protocolSet.sets}
                                onChange={(event) =>
                                  onTrainingDraftChange({
                                    ...trainingDraft,
                                    protocol: {
                                      ...trainingDraft.protocol,
                                      hangboard:
                                        trainingDraft.protocol.hangboard.map(
                                          (item, itemIndex) =>
                                            itemIndex === index
                                              ? {
                                                  ...item,
                                                  sets: event.target.value,
                                                }
                                              : item,
                                        ),
                                    },
                                  })
                                }
                                onDecrement={() =>
                                  onTrainingDraftChange({
                                    ...trainingDraft,
                                    protocol: {
                                      ...trainingDraft.protocol,
                                      hangboard:
                                        trainingDraft.protocol.hangboard.map(
                                          (item, itemIndex) =>
                                            itemIndex === index
                                              ? {
                                                  ...item,
                                                  sets: adjustSeriesValue(
                                                    item.sets,
                                                    -1,
                                                  ),
                                                }
                                              : item,
                                        ),
                                    },
                                  })
                                }
                                onIncrement={() =>
                                  onTrainingDraftChange({
                                    ...trainingDraft,
                                    protocol: {
                                      ...trainingDraft.protocol,
                                      hangboard:
                                        trainingDraft.protocol.hangboard.map(
                                          (item, itemIndex) =>
                                            itemIndex === index
                                              ? {
                                                  ...item,
                                                  sets: adjustSeriesValue(
                                                    item.sets,
                                                    1,
                                                  ),
                                                }
                                              : item,
                                        ),
                                    },
                                  })
                                }
                                decrementAriaLabel={`Odejmij serię ${String.fromCharCode(65 + index)}`}
                                incrementAriaLabel={`Dodaj serię ${String.fromCharCode(65 + index)}`}
                                inputProps={{
                                  type: "number",
                                  min: "1",
                                  step: "1",
                                }}
                                className={styles.trainingSidebar__controlGroup}
                              />
                            </label>
                            {protocolSet.mode === "hangs" && (
                              <label className={styles.trainingSidebar__field}>
                                Maks. 1 powtórzenie
                                <Select
                                  value={protocolSet.usesRpm}
                                  onChange={(event) =>
                                    onTrainingDraftChange({
                                      ...trainingDraft,
                                      protocol: {
                                        ...trainingDraft.protocol,
                                        hangboard:
                                          trainingDraft.protocol.hangboard.map(
                                            (item, itemIndex) =>
                                              itemIndex === index
                                                ? {
                                                    ...item,
                                                    usesRpm: event.target
                                                      .value as "tak" | "nie",
                                                  }
                                                : item,
                                          ),
                                      },
                                    })
                                  }
                                  className={styles.trainingSidebar__input}
                                >
                                  <option value="nie">Nie</option>
                                  <option value="tak">Tak</option>
                                </Select>
                              </label>
                            )}
                            {protocolSet.mode === "intervals" && (
                              <>
                                <label
                                  className={`${styles.trainingSidebar__field} ${styles.trainingSidebar__intervalHangTime}`}
                                >
                                  Czas zwisu (s)
                                  <NumericStepperControl
                                    value={protocolSet.hangSeconds}
                                    onChange={(event) =>
                                      onTrainingDraftChange({
                                        ...trainingDraft,
                                        protocol: {
                                          ...trainingDraft.protocol,
                                          hangboard:
                                            trainingDraft.protocol.hangboard.map(
                                              (item, itemIndex) =>
                                                itemIndex === index
                                                  ? {
                                                      ...item,
                                                      hangSeconds:
                                                        event.target.value,
                                                    }
                                                  : item,
                                            ),
                                        },
                                      })
                                    }
                                    onDecrement={() =>
                                      onTrainingDraftChange({
                                        ...trainingDraft,
                                        protocol: {
                                          ...trainingDraft.protocol,
                                          hangboard:
                                            trainingDraft.protocol.hangboard.map(
                                              (item, itemIndex) =>
                                                itemIndex === index
                                                  ? {
                                                      ...item,
                                                      hangSeconds:
                                                        adjustSeriesValue(
                                                          item.hangSeconds,
                                                          -1,
                                                        ),
                                                    }
                                                  : item,
                                            ),
                                        },
                                      })
                                    }
                                    onIncrement={() =>
                                      onTrainingDraftChange({
                                        ...trainingDraft,
                                        protocol: {
                                          ...trainingDraft.protocol,
                                          hangboard:
                                            trainingDraft.protocol.hangboard.map(
                                              (item, itemIndex) =>
                                                itemIndex === index
                                                  ? {
                                                      ...item,
                                                      hangSeconds:
                                                        adjustSeriesValue(
                                                          item.hangSeconds,
                                                          1,
                                                        ),
                                                    }
                                                  : item,
                                            ),
                                        },
                                      })
                                    }
                                    decrementAriaLabel={`Odejmij sekundę zwisu w serii ${String.fromCharCode(65 + index)}`}
                                    incrementAriaLabel={`Dodaj sekundę zwisu w serii ${String.fromCharCode(65 + index)}`}
                                    inputProps={{
                                      type: "number",
                                      min: "1",
                                      step: "1",
                                    }}
                                    inputSuffix="s"
                                    className={styles.trainingSidebar__input}
                                  />
                                </label>
                                <label
                                  className={`${styles.trainingSidebar__field} ${styles.trainingSidebar__intervalRestTime}`}
                                >
                                  Czas odpoczynku (s)
                                  <NumericStepperControl
                                    value={protocolSet.restSeconds}
                                    onChange={(event) =>
                                      onTrainingDraftChange({
                                        ...trainingDraft,
                                        protocol: {
                                          ...trainingDraft.protocol,
                                          hangboard:
                                            trainingDraft.protocol.hangboard.map(
                                              (item, itemIndex) =>
                                                itemIndex === index
                                                  ? {
                                                      ...item,
                                                      restSeconds:
                                                        event.target.value,
                                                    }
                                                  : item,
                                            ),
                                        },
                                      })
                                    }
                                    onDecrement={() =>
                                      onTrainingDraftChange({
                                        ...trainingDraft,
                                        protocol: {
                                          ...trainingDraft.protocol,
                                          hangboard:
                                            trainingDraft.protocol.hangboard.map(
                                              (item, itemIndex) =>
                                                itemIndex === index
                                                  ? {
                                                      ...item,
                                                      restSeconds:
                                                        adjustCaloriesValue(
                                                          item.restSeconds,
                                                          -1,
                                                        ),
                                                    }
                                                  : item,
                                            ),
                                        },
                                      })
                                    }
                                    onIncrement={() =>
                                      onTrainingDraftChange({
                                        ...trainingDraft,
                                        protocol: {
                                          ...trainingDraft.protocol,
                                          hangboard:
                                            trainingDraft.protocol.hangboard.map(
                                              (item, itemIndex) =>
                                                itemIndex === index
                                                  ? {
                                                      ...item,
                                                      restSeconds:
                                                        adjustCaloriesValue(
                                                          item.restSeconds,
                                                          1,
                                                        ),
                                                    }
                                                  : item,
                                            ),
                                        },
                                      })
                                    }
                                    decrementAriaLabel={`Odejmij sekundę odpoczynku w serii ${String.fromCharCode(65 + index)}`}
                                    incrementAriaLabel={`Dodaj sekundę odpoczynku w serii ${String.fromCharCode(65 + index)}`}
                                    inputProps={{
                                      type: "number",
                                      min: "0",
                                      step: "1",
                                    }}
                                    inputSuffix="s"
                                    className={styles.trainingSidebar__input}
                                  />
                                </label>
                                <label
                                  className={styles.trainingSidebar__field}
                                >
                                  Powtórzenia w serii
                                  <NumericStepperControl
                                    value={protocolSet.repetitions}
                                    onChange={(event) =>
                                      onTrainingDraftChange({
                                        ...trainingDraft,
                                        protocol: {
                                          ...trainingDraft.protocol,
                                          hangboard:
                                            trainingDraft.protocol.hangboard.map(
                                              (item, itemIndex) =>
                                                itemIndex === index
                                                  ? {
                                                      ...item,
                                                      repetitions:
                                                        event.target.value,
                                                    }
                                                  : item,
                                            ),
                                        },
                                      })
                                    }
                                    onDecrement={() =>
                                      onTrainingDraftChange({
                                        ...trainingDraft,
                                        protocol: {
                                          ...trainingDraft.protocol,
                                          hangboard:
                                            trainingDraft.protocol.hangboard.map(
                                              (item, itemIndex) =>
                                                itemIndex === index
                                                  ? {
                                                      ...item,
                                                      repetitions:
                                                        adjustSeriesValue(
                                                          item.repetitions,
                                                          -1,
                                                        ),
                                                    }
                                                  : item,
                                            ),
                                        },
                                      })
                                    }
                                    onIncrement={() =>
                                      onTrainingDraftChange({
                                        ...trainingDraft,
                                        protocol: {
                                          ...trainingDraft.protocol,
                                          hangboard:
                                            trainingDraft.protocol.hangboard.map(
                                              (item, itemIndex) =>
                                                itemIndex === index
                                                  ? {
                                                      ...item,
                                                      repetitions:
                                                        adjustSeriesValue(
                                                          item.repetitions,
                                                          1,
                                                        ),
                                                    }
                                                  : item,
                                            ),
                                        },
                                      })
                                    }
                                    decrementAriaLabel={`Odejmij powtórzenie w serii ${String.fromCharCode(65 + index)} chwytotablicy`}
                                    incrementAriaLabel={`Dodaj powtórzenie w serii ${String.fromCharCode(65 + index)} chwytotablicy`}
                                    inputProps={{
                                      type: "number",
                                      min: "1",
                                      step: "1",
                                    }}
                                    className={styles.trainingSidebar__input}
                                  />
                                </label>
                              </>
                            )}
                            <label className={styles.trainingSidebar__field}>
                              Load / deload (kg)
                              <NumericStepperControl
                                value={protocolSet.loadDeloadKg}
                                onChange={(event) =>
                                  onTrainingDraftChange({
                                    ...trainingDraft,
                                    protocol: {
                                      ...trainingDraft.protocol,
                                      hangboard:
                                        trainingDraft.protocol.hangboard.map(
                                          (item, itemIndex) =>
                                            itemIndex === index
                                              ? {
                                                  ...item,
                                                  loadDeloadKg:
                                                    event.target.value,
                                                }
                                              : item,
                                        ),
                                    },
                                  })
                                }
                                onDecrement={() =>
                                  onTrainingDraftChange({
                                    ...trainingDraft,
                                    protocol: {
                                      ...trainingDraft.protocol,
                                      hangboard:
                                        trainingDraft.protocol.hangboard.map(
                                          (item, itemIndex) =>
                                            itemIndex === index
                                              ? {
                                                  ...item,
                                                  loadDeloadKg:
                                                    adjustLoadDeloadValue(
                                                      item.loadDeloadKg,
                                                      -1,
                                                    ),
                                                }
                                              : item,
                                        ),
                                    },
                                  })
                                }
                                onIncrement={() =>
                                  onTrainingDraftChange({
                                    ...trainingDraft,
                                    protocol: {
                                      ...trainingDraft.protocol,
                                      hangboard:
                                        trainingDraft.protocol.hangboard.map(
                                          (item, itemIndex) =>
                                            itemIndex === index
                                              ? {
                                                  ...item,
                                                  loadDeloadKg:
                                                    adjustLoadDeloadValue(
                                                      item.loadDeloadKg,
                                                      1,
                                                    ),
                                                }
                                              : item,
                                        ),
                                    },
                                  })
                                }
                                decrementAriaLabel={`Odejmij 1 kg w serii ${String.fromCharCode(65 + index)} chwytotablicy`}
                                incrementAriaLabel={`Dodaj 1 kg w serii ${String.fromCharCode(65 + index)} chwytotablicy`}
                                inputProps={{
                                  type: "number",
                                  min: "-200",
                                  max: "200",
                                  step: "1",
                                }}
                                inputSuffix="kg"
                                className={styles.trainingSidebar__input}
                              />
                            </label>
                            <label className={styles.trainingSidebar__field}>
                              Głębokość krawądki (mm)
                              <NumericStepperControl
                                value={protocolSet.edgeDepthMm}
                                onChange={(event) =>
                                  onTrainingDraftChange({
                                    ...trainingDraft,
                                    protocol: {
                                      ...trainingDraft.protocol,
                                      hangboard:
                                        trainingDraft.protocol.hangboard.map(
                                          (item, itemIndex) =>
                                            itemIndex === index
                                              ? {
                                                  ...item,
                                                  edgeDepthMm:
                                                    event.target.value,
                                                }
                                              : item,
                                        ),
                                    },
                                  })
                                }
                                onDecrement={() =>
                                  onTrainingDraftChange({
                                    ...trainingDraft,
                                    protocol: {
                                      ...trainingDraft.protocol,
                                      hangboard:
                                        trainingDraft.protocol.hangboard.map(
                                          (item, itemIndex) =>
                                            itemIndex === index
                                              ? {
                                                  ...item,
                                                  edgeDepthMm:
                                                    adjustEdgeDepthValue(
                                                      item.edgeDepthMm,
                                                      -1,
                                                    ),
                                                }
                                              : item,
                                        ),
                                    },
                                  })
                                }
                                onIncrement={() =>
                                  onTrainingDraftChange({
                                    ...trainingDraft,
                                    protocol: {
                                      ...trainingDraft.protocol,
                                      hangboard:
                                        trainingDraft.protocol.hangboard.map(
                                          (item, itemIndex) =>
                                            itemIndex === index
                                              ? {
                                                  ...item,
                                                  edgeDepthMm:
                                                    adjustEdgeDepthValue(
                                                      item.edgeDepthMm,
                                                      1,
                                                    ),
                                                }
                                              : item,
                                        ),
                                    },
                                  })
                                }
                                decrementAriaLabel={`Odejmij 1 mm w serii ${String.fromCharCode(65 + index)} chwytotablicy`}
                                incrementAriaLabel={`Dodaj 1 mm w serii ${String.fromCharCode(65 + index)} chwytotablicy`}
                                inputProps={{
                                  type: "number",
                                  min: "1",
                                  step: "1",
                                }}
                                inputSuffix="mm"
                                className={styles.trainingSidebar__controlGroup}
                              />
                            </label>
                            {trainingDraft.protocol.hangboard.length > 1 && (
                              <button
                                type="button"
                                aria-label={`Usuń serię ${String.fromCharCode(65 + index)} chwytotablicy`}
                                onClick={() =>
                                  onTrainingDraftChange({
                                    ...trainingDraft,
                                    protocol: {
                                      ...trainingDraft.protocol,
                                      hangboard:
                                        trainingDraft.protocol.hangboard.filter(
                                          (_item, itemIndex) =>
                                            itemIndex !== index,
                                        ),
                                    },
                                  })
                                }
                                className={
                                  styles.trainingSidebar__protocolRemoveButton
                                }
                              >
                                Usuń serię
                              </button>
                            )}
                          </div>
                        ),
                      )}
                      <button
                        type="button"
                        aria-label="Dodaj serię chwytotablicy"
                        title="Dodaj serię"
                        onClick={() =>
                          onTrainingDraftChange({
                            ...trainingDraft,
                            protocol: {
                              ...trainingDraft.protocol,
                              hangboard: [
                                ...trainingDraft.protocol.hangboard,
                                {
                                  sets: "1",
                                  mode: "hangs",
                                  usesRpm: "nie",
                                  hangSeconds: "7",
                                  restSeconds: "3",
                                  repetitions: "6",
                                  loadDeloadKg: "0",
                                  edgeDepthMm: "20",
                                },
                              ],
                            },
                          })
                        }
                        className={styles.trainingSidebar__protocolAddButton}
                      >
                        + Seria
                      </button>
                    </div>
                  )}
                  {trainingDraft.surfaces.includes("spraywall") && (
                    <div className={styles.trainingSidebar__protocolStack}>
                      <span className={protocolHeadingClassName}>
                        Protokół - Spraywall
                      </span>
                      <div
                        className={styles.trainingSidebar__spraywallOptions}
                        role="radiogroup"
                        aria-label="Intensywność Spraywall"
                      >
                        {[
                          {
                            value: "soft" as const,
                            name: "Soft",
                            grades: "V1-V3",
                            description: "Regeneracja i spokojna technika.",
                          },
                          {
                            value: "medium" as const,
                            name: "Medium",
                            grades: "V3-V6",
                            description: "Wytrzymałość i ciągła praca.",
                          },
                          {
                            value: "hard" as const,
                            name: "Hard",
                            grades: "V4-V7",
                            description: "Siła i wymagające ruchy.",
                          },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={
                              trainingDraft.protocol.spraywallIntensity ===
                              option.value
                            }
                            className={`${styles.trainingSidebar__spraywallOption} ${
                              trainingDraft.protocol.spraywallIntensity ===
                              option.value
                                ? styles[
                                    "trainingSidebar__spraywallOption--active"
                                  ]
                                : ""
                            }`}
                            onClick={() =>
                              onTrainingDraftChange({
                                ...trainingDraft,
                                protocol: {
                                  ...trainingDraft.protocol,
                                  spraywallIntensity: option.value,
                                },
                              })
                            }
                          >
                            <span>
                              {option.name} · {option.grades}
                            </span>
                            <small>{option.description}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className={styles.trainingSidebar__formGrid}>
                {gradeSurfaces.map((surface) => {
                  const isExpanded = expandedGradeSurface === surface;
                  const grades = splitDifficultyGrades(
                    trainingDraft.difficultyBySurface[surface] ?? "",
                  );
                  const addGrade = (grade: string) =>
                    onTrainingDraftChange({
                      ...trainingDraft,
                      difficultyBySurface: {
                        ...trainingDraft.difficultyBySurface,
                        [surface]: [...grades, grade].join(", "),
                      },
                    });

                  return (
                    <div key={surface} className={fullFieldClassName}>
                      <label className={protocolHeadingClassName}>
                        Wyceny - {gradeSurfaceLabels[surface]}
                        <InputActionControl
                          value={
                            trainingDraft.difficultyBySurface[surface] ?? ""
                          }
                          readOnly
                          placeholder={
                            surface === "lina"
                              ? "Kliknij, aby wybrać wyceny"
                              : surface === "baldy"
                                ? "Skala boulderowni 1-9"
                                : "Skala V1-V10"
                          }
                          onClick={() => {
                            setSelectedRopeGradeBase(null);
                            setExpandedGradeSurface(
                              isExpanded ? null : surface,
                            );
                          }}
                          className={styles.trainingSidebar__input}
                          action={
                            <button
                              type="button"
                              aria-label={`Wyczyść wyceny: ${gradeSurfaceLabels[surface]}`}
                              title="Wyczyść wyceny"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={(event) => {
                                event.stopPropagation();
                                onTrainingDraftChange({
                                  ...trainingDraft,
                                  difficultyBySurface: {
                                    ...trainingDraft.difficultyBySurface,
                                    [surface]: "",
                                  },
                                });
                              }}
                              className={formControlClassNames.trailingAction}
                            >
                              X
                            </button>
                          }
                        />
                      </label>

                      {isExpanded && surface === "lina" && (
                        <div className={styles.trainingSidebar__stack}>
                          <div className={styles.trainingSidebar__chipGrid}>
                            {ropeGradeBases.map((base) => (
                              <button
                                key={base}
                                type="button"
                                aria-pressed={selectedRopeGradeBase === base}
                                onClick={() => setSelectedRopeGradeBase(base)}
                                className={[
                                  styles.trainingSidebar__chip,
                                  styles.trainingSidebar__gradeChip,
                                  styles[`trainingSidebar__gradeChip--${base}`],
                                  selectedRopeGradeBase === base
                                    ? styles["trainingSidebar__chip--active"]
                                    : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                {base}
                              </button>
                            ))}
                          </div>
                          {selectedRopeGradeBase && (
                            <div className={styles.trainingSidebar__chipGrid}>
                              {ropeGradeModifiers.map((modifier) => {
                                const grade = `${selectedRopeGradeBase}${modifier}`;

                                return (
                                  <button
                                    key={modifier}
                                    type="button"
                                    onClick={() => addGrade(grade)}
                                    className={[
                                      styles.trainingSidebar__chip,
                                      styles.trainingSidebar__gradeChip,
                                      styles[
                                        `trainingSidebar__gradeChip--${selectedRopeGradeBase}`
                                      ],
                                      styles[
                                        `trainingSidebar__gradeChip--${modifier}`
                                      ],
                                    ]
                                      .filter(Boolean)
                                      .join(" ")}
                                  >
                                    {modifier}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {isExpanded && surface !== "lina" && (
                        <div className={styles.trainingSidebar__chipGrid}>
                          {(surface === "baldy"
                            ? boulderGymGrades
                            : boardGrades
                          ).map((grade) => (
                            <button
                              key={grade}
                              type="button"
                              onClick={() => addGrade(grade)}
                              className={[
                                styles.trainingSidebar__chip,
                                styles.trainingSidebar__gradeChip,
                                surface === "baldy"
                                  ? styles[
                                      `trainingSidebar__gradeChip--boulder-${grade}`
                                    ]
                                  : styles[
                                      `trainingSidebar__gradeChip--${surface}-${grade.slice(1)}`
                                    ],
                                grades.includes(grade)
                                  ? styles["trainingSidebar__chip--active"]
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              {grade}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <label className={styles.trainingSidebar__field}>
                <strong className={styles.trainingSidebar__protocolHeading}>
                  Samopoczucie i notatki
                </strong>
                <TextArea
                  value={combinedNotes}
                  onChange={(event) =>
                    onTrainingDraftChange({
                      ...trainingDraft,
                      wellbeing: "",
                      notes: event.target.value,
                    })
                  }
                  rows={4}
                  className={styles.trainingSidebar__input}
                />
              </label>

              <div className={styles.trainingSidebar__formActions}>
                <Button
                  type="submit"
                  variant="tertiary"
                  className={styles.trainingSidebar__submitButton}
                >
                  {editingTrainingId ? "Zapisz zmiany" : "Zapisz trening"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={onResetSelection}
                  className={styles.trainingSidebar__ghostButton}
                >
                  ANULUJ
                </Button>
                {editingTraining ? (
                  <Button
                    variant="quadrary"
                    onClick={() => onDeleteTraining(editingTraining)}
                    className={styles.trainingSidebar__secondaryButton}
                  >
                    Usuń trening
                  </Button>
                ) : null}
              </div>
            </form>
          </section>
        )}

        {!isSelectionActive && (
          <section className={summaryPanelClassName}>
            <div className={styles.trainingSidebar__panelHeader}>
              <div>
                <p className={styles.trainingSidebar__eyebrow}>
                  Widoczny okres
                </p>
                <h1 className={styles.trainingSidebar__title}>
                  Lista treningów w kalendarzu
                </h1>
              </div>
              <div className={styles.trainingSidebar__headerActions}>
                <Button
                  variant="tertiary"
                  onClick={() => onSelectDate(today)}
                  className={styles.trainingSidebar__submitButton}
                >
                  + Trening
                </Button>
              </div>
            </div>

            <div className={styles.trainingSidebar__visibleList}>
              {visibleRangeTrainings.length === 0 && (
                <p className={styles.trainingSidebar__helperText}>
                  W wybranym zakresie jeszcze nie ma treningów.
                </p>
              )}
              {visibleRangeTrainings.map((training) => (
                <article
                  key={`${training.id ?? training.createdAt}-${training.time}`}
                  className={styles.trainingSidebar__trainingCard}
                >
                  <div className={styles.trainingSidebar__trainingButtonHeader}>
                    <strong>{summarizeTrainingType(training)}</strong>
                    <span className={styles.trainingSidebar__pill}>
                      {training.date}
                    </span>
                  </div>
                  <div className={styles.trainingSidebar__metaLine}>
                    <span>
                      {training.time} · {training.durationMinutes} min ·{" "}
                      {training.bodyWeightKg} kg · Kalorie:{" "}
                      {training.caloriesBurned}
                    </span>
                  </div>
                  <TrainingTimelineBar
                    time={training.time}
                    durationMinutes={training.durationMinutes}
                    difficultyNotes={training.difficultyNotes}
                    difficultyBySurface={training.difficultyBySurface}
                    surfaces={training.surfaces}
                  />
                  {training.difficultyNotes?.trim() ? (
                    <div className={styles.trainingSidebar__details}>
                      <span>Wyceny: {training.difficultyNotes}</span>
                    </div>
                  ) : null}
                  <div className={styles.trainingSidebar__cardActions}>
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => onEditTraining(training)}
                      className={styles.trainingSidebar__linkButton}
                    >
                      Edytuj
                    </Button>
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => setPreviewedTraining(training)}
                      className={styles.trainingSidebar__linkButton}
                    >
                      Podgląd
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </ScrollPane>
      {previewedTraining && (
        <Modal
          labelledBy="training-preview-title"
          onClose={closePreview}
          overlayStyle={{
            display: "flex",
            justifyContent: "flex-end",
            padding: 0,
          }}
          style={{
            width: "min(100%, 520px)",
            height: "100dvh",
            maxHeight: "100dvh",
            padding: 0,
            overflow: "hidden",
            background: "#fffdfa",
            boxShadow: "-18px 0 40px rgba(21, 34, 45, 0.2)",
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
                <h2
                  id="training-preview-title"
                  className={styles.trainingSidebar__drawerTitle}
                >
                  {summarizeTrainingType(previewedTraining)}
                </h2>
              </div>
            </div>
            <dl className={styles.trainingSidebar__previewDetails}>
              <div>
                <dt>Data</dt>
                <dd>{formatDateLabel(previewedTraining.date)}</dd>
              </div>
              <div>
                <dt>Godzina</dt>
                <dd>{previewedTraining.time}</dd>
              </div>
              <div>
                <dt>Czas</dt>
                <dd>{previewedTraining.durationMinutes} min</dd>
              </div>
              <div className={styles.trainingSidebar__previewDetailsFull}>
                <dt>Kalorie</dt>
                <dd className={styles.trainingSidebar__caloriesValue}>
                  {previewCalories} / 1000 kcal
                </dd>
                <div
                  className={styles.trainingSidebar__caloriesProgress}
                  role="progressbar"
                  aria-label="Kalorie względem normy"
                  aria-valuemin={0}
                  aria-valuemax={1000}
                  aria-valuenow={previewCalories}
                >
                  <div
                    className={styles.trainingSidebar__caloriesProgressFill}
                    style={{ width: `${(previewCalories / 1000) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <dt>Masa ciała</dt>
                <dd>{previewedTraining.bodyWeightKg} kg</dd>
              </div>
              <div>
                <dt>Wiek</dt>
                <dd>{previewedTraining.ageYears} lat</dd>
              </div>
              <div>
                <dt>Wstawki</dt>
                <dd>{formatReportedAttempts(previewedTraining)}</dd>
              </div>
              <div>
                <dt>Rodzaj</dt>
                <dd>{formatSurfaces(previewedTraining) || "Brak"}</dd>
              </div>
              <div className={styles.trainingSidebar__previewDetailsFull}>
                <dt>Wyceny</dt>
                <dd>{getTrainingGradesDescription(previewedTraining)}</dd>
              </div>
              {previewedTraining.protocol?.pullUp?.length ? (
                <div className={styles.trainingSidebar__previewDetailsFull}>
                  <dt>Drążek</dt>
                  <dd>{formatPullUpProtocol(previewedTraining)}</dd>
                </div>
              ) : null}
              {previewedTraining.protocol?.hangboard?.length ? (
                <div className={styles.trainingSidebar__previewDetailsFull}>
                  <dt>Chwytotablica</dt>
                  <dd>{formatHangboardProtocol(previewedTraining)}</dd>
                </div>
              ) : null}
              {previewedTraining.wellbeing ? (
                <div className={styles.trainingSidebar__previewDetailsFull}>
                  <dt>Samopoczucie</dt>
                  <dd>{previewedTraining.wellbeing}</dd>
                </div>
              ) : null}
              {previewedTraining.notes ? (
                <div className={styles.trainingSidebar__previewDetailsFull}>
                  <dt>Notatki</dt>
                  <dd>{previewedTraining.notes}</dd>
                </div>
              ) : null}
            </dl>
            <section className={styles.trainingSidebar__previewCharts}>
              <div>
                <p className={styles.trainingSidebar__eyebrow}>Wykres sesji</p>
                <h3 className={styles.trainingSidebar__previewChartsTitle}>
                  Wyceny na sesję
                </h3>
              </div>
              <div className={styles.trainingSidebar__previewChart}>
                <h4>Wyceny na sesję</h4>
                <RopeTrainingGradesChart
                  trainings={[previewedTraining]}
                  chartRange={{
                    start: previewedTraining.date,
                    end: previewedTraining.date,
                  }}
                />
              </div>
            </section>
            <div className={styles.trainingSidebar__drawerActions}>
              <Button
                variant="tertiary"
                onClick={() => {
                  onEditTraining(previewedTraining);
                  closePreview();
                  setSelectedDayTab("form");
                }}
                className={styles.trainingSidebar__submitButton}
              >
                Edytuj
              </Button>
            </div>
          </ScrollPane>
        </Modal>
      )}
    </aside>
  );
}

function getTrainingGradesDescription(training: TrainingRecord) {
  const surfaceGrades = Object.entries(training.difficultyBySurface ?? {})
    .filter(([, grade]) => Boolean(grade))
    .map(
      ([surface, grade]) =>
        `${gradeSurfaceLabels[surface as TrainingSurface] ?? surface}: ${grade}`,
    );

  return surfaceGrades.join(" · ") || training.difficultyNotes || "Brak";
}

function formatReportedAttempts(training: TrainingRecord) {
  const attemptsBySurface = Object.entries(training.difficultyBySurface ?? {})
    .map(([surface, grades]) => ({
      surface: surface as TrainingSurface,
      count: splitDifficultyGrades(grades).length,
    }))
    .filter((entry) => entry.count > 0);

  if (attemptsBySurface.length === 0) {
    return String(splitDifficultyGrades(training.difficultyNotes).length);
  }

  const total = attemptsBySurface.reduce((sum, entry) => sum + entry.count, 0);
  const breakdown = attemptsBySurface
    .map(
      (entry) =>
        `${gradeSurfaceLabels[entry.surface] ?? entry.surface}: ${entry.count}`,
    )
    .join(", ");

  return `${total} (${breakdown})`;
}

function formatPullUpProtocol(training: TrainingRecord) {
  return (training.protocol?.pullUp ?? [])
    .map(
      (set, index) =>
        `Seria ${index + 1}: ${set.sets} takich serii × ${set.repetitions ?? 1} powt., ${set.isOneRepMax ? "1RM, " : ""}${set.loadDeloadKg} kg`,
    )
    .join(" · ");
}

function formatHangboardProtocol(training: TrainingRecord) {
  return (training.protocol?.hangboard ?? [])
    .map(
      (set, index) =>
        `Seria ${index + 1}: ${set.sets} powt., ${set.usesRpm ? "maks. 1 powt." : "bez maksa"}, ${set.loadDeloadKg} kg, ${set.edgeDepthMm} mm`,
    )
    .join(" · ");
}
