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
import { ScrollPane } from "@/components/climberbook/common/ScrollPane";
import { type TrainingRecord, type TrainingSurface } from "@/lib/climbs-db";
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
const boardGrades = Array.from({ length: 18 }, (_value, index) => `V${index}`);

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
      loadDeloadKg: string;
    }>;
    hangboard: Array<{
      sets: string;
      usesRpm: "tak" | "nie";
      loadDeloadKg: string;
      edgeDepthMm: string;
    }>;
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
  const [expandedGradeSurface, setExpandedGradeSurface] =
    useState<TrainingSurface | null>(null);
  const [selectedRopeGradeBase, setSelectedRopeGradeBase] = useState<
    string | null
  >(null);
  const [selectedDayTab, setSelectedDayTab] = useState<"trainings" | "form">(
    "form",
  );
  const [isCustomSessionExpanded, setIsCustomSessionExpanded] = useState(false);
  useEffect(() => {
    setSelectedDayTab("form");
  }, [selectedDate]);
  const gradeSurfaces = trainingDraft.surfaces.filter(
    (surface) => gradeSurfaceLabels[surface],
  );
  const combinedNotes = [trainingDraft.wellbeing, trainingDraft.notes]
    .filter(Boolean)
    .join("\n\n");

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
                <h1 className={styles.trainingSidebar__title}>
                  {formatDateLabel(selectedDate)}
                </h1>
              </div>
              <div className={styles.trainingSidebar__headerActions}>
                <button
                  type="button"
                  onClick={onResetSelection}
                  className={styles.trainingSidebar__ghostButton}
                >
                  ANULUJ
                </button>
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
                    />
                    <div className={styles.trainingSidebar__metaLine}>
                      <span>
                        {training.time} · {training.durationMinutes} min ·{" "}
                        {training.bodyWeightKg} kg · Kalorie:{" "}
                        {training.caloriesBurned}
                      </span>
                    </div>
                    <div className={styles.trainingSidebar__details}>
                      <span>Wyceny: {training.difficultyNotes || "Brak"}</span>
                    </div>
                    <div className={styles.trainingSidebar__cardActions}>
                      <button
                        type="button"
                        onClick={() => {
                          onEditTraining(training);
                          setSelectedDayTab("form");
                        }}
                        className={styles.trainingSidebar__linkButton}
                      >
                        Edytuj
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTraining(training)}
                        className={styles.trainingSidebar__deleteButton}
                      >
                        Usuń
                      </button>
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
                  <strong>Rodzaj sesji</strong>
                  <div className={styles.trainingSidebar__chipGrid}>
                    {surfaceOptions.slice(0, 8).map((option) => {
                      const active = trainingDraft.surfaces.includes(
                        option.value,
                      );
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
                    })}
                  </div>
                  <div className={styles.trainingSidebar__chipGrid}>
                    {surfaceOptions.slice(8).map((option) => {
                      const active = trainingDraft.surfaces.includes(
                        option.value,
                      );
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
                    })}
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
                trainingDraft.surfaces.includes("chwytotablica")) && (
                <div className={styles.trainingSidebar__protocolStacks}>
                  {trainingDraft.surfaces.includes("drazek") && (
                    <div className={styles.trainingSidebar__protocolStack}>
                      <strong className={fullFieldClassName}>
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
                            <label className={styles.trainingSidebar__field}>
                              Ilość serii
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
                            <label className={styles.trainingSidebar__field}>
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
                                { sets: "1", loadDeloadKg: "0" },
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
                      <strong className={fullFieldClassName}>
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
                            <label className={styles.trainingSidebar__field}>
                              RPM
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
                                  usesRpm: "nie",
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
                      <label>
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
                                : "Skala V0-V17"
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
                Samopoczucie i notatki
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

              <button
                type="submit"
                className={styles.trainingSidebar__submitButton}
              >
                {editingTrainingId ? "Zapisz zmiany" : "Zapisz trening"}
              </button>
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
                <span className={styles.trainingSidebar__pill}>
                  {visibleRangeTrainings.length} wpisów
                </span>
                <button
                  type="button"
                  onClick={() => onSelectDate(today)}
                  className={styles.trainingSidebar__submitButton}
                >
                  + Trening
                </button>
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
                  className={styles.trainingSidebar__visibleItem}
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
                  />
                  <div className={styles.trainingSidebar__details}>
                    <span>Wyceny: {training.difficultyNotes || "Brak"}</span>
                    <span>Rodzaj: {formatSurfaces(training) || "Brak"}</span>
                  </div>
                  <div className={styles.trainingSidebar__cardActions}>
                    <button
                      type="button"
                      onClick={() => onEditTraining(training)}
                      className={styles.trainingSidebar__linkButton}
                    >
                      Edytuj
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTraining(training)}
                      className={styles.trainingSidebar__deleteButton}
                    >
                      Usuń
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </ScrollPane>
    </aside>
  );
}
