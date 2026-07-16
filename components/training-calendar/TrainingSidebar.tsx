import { FormEvent, useState } from "react";
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

const gradeBases = ["5", "6", "7", "8"];
const gradeModifiers = ["a", "a+", "b", "b+", "c", "c+"];

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
  attemptsCount: string;
  difficultyNotes: string;
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

function adjustAttemptsValue(value: string, delta: number) {
  const parsedValue = Number(value);
  const nextValue = Math.max(
    0,
    Math.trunc(Number.isNaN(parsedValue) ? 0 : parsedValue) + delta,
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
  const [selectedGradeBase, setSelectedGradeBase] = useState<string | null>(
    null,
  );
  const selectedDifficultyGrades = splitDifficultyGrades(
    trainingDraft.difficultyNotes,
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
                <span className={styles.trainingSidebar__pill}>
                  {selectedDayTrainings.length} treningi
                </span>
                <button
                  type="button"
                  onClick={onResetSelection}
                  className={styles.trainingSidebar__ghostButton}
                >
                  ANULUJ
                </button>
              </div>
            </div>

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
                  <div className={styles.trainingSidebar__trainingButtonHeader}>
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
                      {training.caloriesBurned} · Wstawki:{" "}
                      {training.attemptsCount}
                    </span>
                  </div>
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

        {isSelectionActive && (
          <section className={styles.trainingSidebar__panel}>
            <div className={styles.trainingSidebar__panelHeader}>
              <div>
                <h1 className={styles.trainingSidebar__eyebrow}>
                  {editingTrainingId ? "Edycja treningu" : "DODAJ TRENING"}
                </h1>
                <h2 className={styles.trainingSidebar__title}>
                  {editingTrainingId
                    ? "Aktualizuj wpis dnia"
                    : "Dodaj trening do dnia"}
                </h2>
              </div>
            </div>

            <form onSubmit={onSubmit} className={styles.trainingSidebar__form}>
              {validationMessage ? (
                <p className={styles.trainingSidebar__validationMessage}>
                  {validationMessage}
                </p>
              ) : null}
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
                </div>
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
              </div>
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
                  Waga (kg)
                  <NumericStepperControl
                    value={trainingDraft.bodyWeightKg}
                    onChange={(event) =>
                      onTrainingDraftChange({
                        ...trainingDraft,
                        bodyWeightKg: normalizeDecimalInput(event.target.value),
                      })
                    }
                    onDecrement={() =>
                      onTrainingDraftChange({
                        ...trainingDraft,
                        bodyWeightKg: adjustWeightValue(
                          trainingDraft.bodyWeightKg,
                          -0.1,
                        ),
                      })
                    }
                    onIncrement={() =>
                      onTrainingDraftChange({
                        ...trainingDraft,
                        bodyWeightKg: adjustWeightValue(
                          trainingDraft.bodyWeightKg,
                          0.1,
                        ),
                      })
                    }
                    inputProps={{
                      onBlur: () =>
                        onTrainingDraftChange({
                          ...trainingDraft,
                          bodyWeightKg: formatWeightToSingleDecimal(
                            trainingDraft.bodyWeightKg,
                          ),
                        }),
                      type: "number",
                      min: "0",
                      step: "0.1",
                      required: true,
                    }}
                    className={styles.trainingSidebar__controlGroup}
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
                <label className={styles.trainingSidebar__field}>
                  Wstawki
                  <NumericStepperControl
                    value={trainingDraft.attemptsCount}
                    onChange={(event) =>
                      onTrainingDraftChange({
                        ...trainingDraft,
                        attemptsCount: event.target.value,
                      })
                    }
                    onDecrement={() =>
                      onTrainingDraftChange({
                        ...trainingDraft,
                        attemptsCount: adjustAttemptsValue(
                          trainingDraft.attemptsCount,
                          -1,
                        ),
                      })
                    }
                    onIncrement={() =>
                      onTrainingDraftChange({
                        ...trainingDraft,
                        attemptsCount: adjustAttemptsValue(
                          trainingDraft.attemptsCount,
                          1,
                        ),
                      })
                    }
                    decrementAriaLabel="Odejmij jedną wstawkę"
                    incrementAriaLabel="Dodaj jedną wstawkę"
                    decrementTitle="Odejmij jedną wstawkę"
                    incrementTitle="Dodaj jedną wstawkę"
                    inputProps={{
                      type: "number",
                      min: "0",
                      step: "1",
                      required: true,
                    }}
                    className={styles.trainingSidebar__controlGroup}
                  />
                </label>
                <div className={fullFieldClassName}>
                  <span>Wyceny</span>
                  <InputActionControl
                    value={trainingDraft.difficultyNotes}
                    readOnly
                    placeholder="Wybierz wyceny poniżej"
                    aria-label="Wybrane wyceny"
                    className={styles.trainingSidebar__input}
                    action={
                      <button
                        type="button"
                        aria-label="Wyczyść wyceny"
                        title="Wyczyść wyceny"
                        onClick={() => {
                          setSelectedGradeBase(null);
                          onTrainingDraftChange({
                            ...trainingDraft,
                            difficultyNotes: "",
                            attemptsCount: "0",
                          });
                        }}
                        className={formControlClassNames.trailingAction}
                      >
                        X
                      </button>
                    }
                  />
                  <div
                    className={[
                      styles.trainingSidebar__chipGrid,
                      styles.trainingSidebar__gradeChipGrid,
                    ].join(" ")}
                  >
                    {gradeBases.map((gradeBase) => {
                      const active = selectedGradeBase === gradeBase;
                      const chipClassName = [
                        styles.trainingSidebar__chip,
                        styles.trainingSidebar__gradeChip,
                        styles[`trainingSidebar__gradeChip--${gradeBase}`],
                        active ? styles["trainingSidebar__chip--active"] : "",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <button
                          key={gradeBase}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSelectedGradeBase(gradeBase)}
                          className={chipClassName}
                        >
                          {gradeBase}
                        </button>
                      );
                    })}
                  </div>

                  {selectedGradeBase && (
                    <div
                      className={[
                        styles.trainingSidebar__chipGrid,
                        styles.trainingSidebar__gradeChipGrid,
                      ].join(" ")}
                    >
                      {gradeModifiers.map((gradeModifier) => {
                        const grade = `${selectedGradeBase}${gradeModifier}`;
                        const active = selectedDifficultyGrades.includes(grade);
                        const chipClassName = [
                          styles.trainingSidebar__chip,
                          styles.trainingSidebar__gradeChip,
                          styles[
                            `trainingSidebar__gradeChip--${selectedGradeBase}`
                          ],
                          styles[
                            `trainingSidebar__gradeChip--${gradeModifier}`
                          ],
                          active ? styles["trainingSidebar__chip--active"] : "",
                        ]
                          .filter(Boolean)
                          .join(" ");

                        return (
                          <button
                            key={gradeModifier}
                            type="button"
                            aria-pressed={active}
                            onClick={() => {
                              const nextGrades = [
                                ...selectedDifficultyGrades,
                                grade,
                              ];

                              onTrainingDraftChange({
                                ...trainingDraft,
                                difficultyNotes: nextGrades.join(", "),
                                attemptsCount: String(nextGrades.length),
                              });
                            }}
                            className={chipClassName}
                          >
                            {gradeModifier}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
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
                  + Nowy trening
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
                      {training.caloriesBurned} · Wstawki:{" "}
                      {training.attemptsCount}
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
