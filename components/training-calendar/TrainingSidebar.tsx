import { FormEvent } from "react";
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
  notes: string;
};

function adjustWeightValue(value: string, delta: number) {
  const normalizedValue = normalizeDecimalInput(value || "0");
  const parsedValue = Number(normalizedValue);
  const nextValue = Math.max(0, (Number.isNaN(parsedValue) ? 0 : parsedValue) + delta);

  return nextValue.toFixed(1);
}

type TrainingSidebarProps = {
  selectedDate: string | null;
  selectedDayTrainings: TrainingRecord[];
  visibleRangeTrainings: TrainingRecord[];
  trainingDraft: TrainingDraftValues;
  editingTrainingId: number | null;
  surfaceOptions: Array<{ value: TrainingSurface; label: string }>;
  onTrainingDraftChange: (draft: TrainingDraftValues) => void;
  onToggleSurface: (surface: TrainingSurface) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEditTraining: (training: TrainingRecord) => void;
  onResetSelection: () => void;
  onCancelEdit: () => void;
};

export function TrainingSidebar(props: TrainingSidebarProps) {
  const {
    selectedDate,
    selectedDayTrainings,
    visibleRangeTrainings,
    trainingDraft,
    editingTrainingId,
    surfaceOptions,
    onTrainingDraftChange,
    onToggleSurface,
    onSubmit,
    onEditTraining,
    onResetSelection,
    onCancelEdit,
  } = props;

  const isSelectionActive = selectedDate !== null;
  const displayedTrainings = isSelectionActive ? selectedDayTrainings : visibleRangeTrainings;
  const sidebarClassName = [
    styles.trainingSidebar,
    isSelectionActive ? styles["trainingSidebar--selected"] : styles["trainingSidebar--default"],
  ].join(" ");
  const summaryPanelClassName = [
    styles.trainingSidebar__panel,
    isSelectionActive ? styles["trainingSidebar__panel--filling"] : "",
  ].filter(Boolean).join(" ");
  const fullFieldClassName = [styles.trainingSidebar__field, styles["trainingSidebar__field--full"]].join(" ");
  const growInputClassName = [styles.trainingSidebar__input, styles["trainingSidebar__input--grow"]].join(" ");

  return (
    <aside className={sidebarClassName}>
      {isSelectionActive && selectedDate && (
        <section className={styles.trainingSidebar__panel}>
          <div className={styles.trainingSidebar__panelHeader}>
            <div>
              <p className={styles.trainingSidebar__eyebrow}>Wybrany dzień</p>
              <h3 className={styles.trainingSidebar__title}>{formatDateLabel(selectedDate)}</h3>
            </div>
            <div className={styles.trainingSidebar__headerActions}>
              <span className={styles.trainingSidebar__pill}>{selectedDayTrainings.length} treningi</span>
              <button type="button" onClick={onResetSelection} className={styles.trainingSidebar__ghostButton}>
                ANULUJ
              </button>
            </div>
          </div>

          <div className={styles.trainingSidebar__stack}>
            {selectedDayTrainings.length === 0 && <p className={styles.trainingSidebar__helperText}>Brak treningów dla tego dnia. Dodaj pierwszy wpis.</p>}
            {selectedDayTrainings.map((training) => (
              <button key={training.id} type="button" onClick={() => onEditTraining(training)} className={styles.trainingSidebar__trainingButton}>
                <div className={styles.trainingSidebar__trainingButtonHeader}>
                  <strong>
                    {training.time} · {summarizeTrainingType(training)}
                  </strong>
                  <span className={styles.trainingSidebar__pill}>{training.durationMinutes} min</span>
                </div>
                <TrainingTimelineBar time={training.time} durationMinutes={training.durationMinutes} />
                <div className={styles.trainingSidebar__metaGrid}>
                  <span>Kalorie: {training.caloriesBurned}</span>
                  <span>Wstawki: {training.attemptsCount}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {isSelectionActive && (
        <section className={styles.trainingSidebar__panel}>
          <div className={styles.trainingSidebar__panelHeader}>
            <div>
              <p className={styles.trainingSidebar__eyebrow}>{editingTrainingId ? "Edycja treningu" : "DODAJ TRENING"}</p>
              <h3 className={styles.trainingSidebar__title}>{editingTrainingId ? "Aktualizuj wpis dnia" : "Dodaj trening do dnia"}</h3>
            </div>
            
          </div>

          <form onSubmit={onSubmit} className={styles.trainingSidebar__form}>
          <div className={styles.trainingSidebar__formGrid}>
            <label className={styles.trainingSidebar__field}>
              Data
              <input
                value={trainingDraft.date}
                onChange={(event) => onTrainingDraftChange({ ...trainingDraft, date: event.target.value })}
                type="date"
                required
                className={styles.trainingSidebar__input}
              />
            </label>
            <label className={styles.trainingSidebar__field}>
              Godzina
              <select
                value={trainingDraft.time}
                onChange={(event) => onTrainingDraftChange({ ...trainingDraft, time: event.target.value })}
                required
                className={styles.trainingSidebar__input}
              >
                {timeOptions.map((timeOption) => (
                  <option key={timeOption} value={timeOption}>
                    {timeOption}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.trainingSidebar__field}>
              Czas (min)
              <input
                value={trainingDraft.durationMinutes}
                onChange={(event) => onTrainingDraftChange({ ...trainingDraft, durationMinutes: event.target.value })}
                type="number"
                min="1"
                required
                className={styles.trainingSidebar__input}
              />
            </label>
            <label className={styles.trainingSidebar__field}>
              Wiek (z settings)
              <input
                value={trainingDraft.ageYears}
                readOnly
                type="number"
                min="1"
                className={styles.trainingSidebar__input}
              />
            </label>
            <label className={styles.trainingSidebar__field}>
              Waga (kg)
              <div className={styles.trainingSidebar__controlGroup}>
                <button
                  type="button"
                  onClick={() => onTrainingDraftChange({ ...trainingDraft, bodyWeightKg: adjustWeightValue(trainingDraft.bodyWeightKg, -0.1) })}
                  className={styles.trainingSidebar__stepButton}
                >
                  -
                </button>
                <input
                  value={trainingDraft.bodyWeightKg}
                  onChange={(event) =>
                    onTrainingDraftChange({ ...trainingDraft, bodyWeightKg: normalizeDecimalInput(event.target.value) })
                  }
                  onBlur={() =>
                    onTrainingDraftChange({ ...trainingDraft, bodyWeightKg: formatWeightToSingleDecimal(trainingDraft.bodyWeightKg) })
                  }
                  type="number"
                  min="0"
                  step="0.1"
                  required
                  className={growInputClassName}
                />
                <button
                  type="button"
                  onClick={() => onTrainingDraftChange({ ...trainingDraft, bodyWeightKg: adjustWeightValue(trainingDraft.bodyWeightKg, 0.1) })}
                  className={styles.trainingSidebar__stepButton}
                >
                  +
                </button>
              </div>
            </label>
            <label className={styles.trainingSidebar__field}>
              Kalorie
              <div className={styles.trainingSidebar__controlGroup}>
                <input
                  value={trainingDraft.caloriesBurned}
                  onChange={(event) =>
                    onTrainingDraftChange({
                      ...trainingDraft,
                      caloriesBurned: event.target.value,
                      caloriesMode: "manual",
                    })
                  }
                  placeholder="Auto z wagi, wieku i czasu"
                  type="number"
                  min="0"
                  className={growInputClassName}
                />
                <button
                  type="button"
                  onClick={() =>
                    onTrainingDraftChange({
                      ...trainingDraft,
                      caloriesBurned: "",
                      caloriesMode: "auto",
                    })
                  }
                  className={styles.trainingSidebar__stepButton}
                >
                  Auto
                </button>
              </div>
            </label>
            <label className={styles.trainingSidebar__field}>
              Wstawki
              <input
                value={trainingDraft.attemptsCount}
                onChange={(event) => onTrainingDraftChange({ ...trainingDraft, attemptsCount: event.target.value })}
                type="number"
                min="0"
                required
                className={styles.trainingSidebar__input}
              />
            </label>
            <label className={fullFieldClassName}>
              Wyceny
              <input
                value={trainingDraft.difficultyNotes}
                onChange={(event) => onTrainingDraftChange({ ...trainingDraft, difficultyNotes: event.target.value })}
                placeholder="Np. 7a, 7a+/b, projekt 7b+"
                className={styles.trainingSidebar__input}
              />
            </label>
            <label className={fullFieldClassName}>
              Samopoczucie
              <textarea
                value={trainingDraft.wellbeing}
                onChange={(event) => onTrainingDraftChange({ ...trainingDraft, wellbeing: event.target.value })}
                rows={3}
                className={[styles.trainingSidebar__input, styles.trainingSidebar__textarea].join(" ")}
              />
            </label>
          </div>

          <div className={styles.trainingSidebar__stack}>
            <strong>Rodzaj sesji</strong>
            <div className={styles.trainingSidebar__chipGrid}>
              {surfaceOptions.map((option) => {
                const active = trainingDraft.surfaces.includes(option.value);
                const chipClassName = [
                  styles.trainingSidebar__chip,
                  active ? styles["trainingSidebar__chip--active"] : "",
                ].filter(Boolean).join(" ");

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
          </div>

          <label className={styles.trainingSidebar__field}>
            Notatki
            <textarea
              value={trainingDraft.notes}
              onChange={(event) => onTrainingDraftChange({ ...trainingDraft, notes: event.target.value })}
              rows={4}
              className={[styles.trainingSidebar__input, styles.trainingSidebar__textarea].join(" ")}
            />
          </label>

          <button type="submit" className={styles.trainingSidebar__submitButton}>
            {editingTrainingId ? "Zapisz zmiany" : "Dodaj trening"}
          </button>
          </form>
        </section>
      )}

      <section className={summaryPanelClassName}>
        <div className={styles.trainingSidebar__panelHeader}>
          <div>
            <p className={styles.trainingSidebar__eyebrow}>{isSelectionActive ? "Wybrany dzień" : "Widoczny okres"}</p>
            <h3 className={styles.trainingSidebar__title}>
              {isSelectionActive && selectedDate ? `Treningi z ${formatDateLabel(selectedDate)}` : "Lista treningów w kalendarzu"}
            </h3>
          </div>
          <span className={styles.trainingSidebar__pill}>{displayedTrainings.length} wpisów</span>
        </div>

        <div className={styles.trainingSidebar__visibleList}>
          {displayedTrainings.length === 0 && (
            <p className={styles.trainingSidebar__helperText}>
              {isSelectionActive ? "Brak treningów w wybranym dniu." : "W wybranym zakresie jeszcze nie ma treningów."}
            </p>
          )}
          {displayedTrainings.map((training) => (
            <article key={`${training.id ?? training.createdAt}-${training.time}`} className={styles.trainingSidebar__visibleItem}>
              <div className={styles.trainingSidebar__trainingButtonHeader}>
                <strong>{summarizeTrainingType(training)}</strong>
                <span className={styles.trainingSidebar__pill}>{training.date}</span>
              </div>
              <div className={[styles.trainingSidebar__metaGrid, styles["trainingSidebar__metaGrid--summary"]].join(" ")}>
              <span className={styles.trainingSidebar__minorText}>{training.time} · {training.durationMinutes} min</span>
                <span>Kalorie: {training.caloriesBurned}</span>
                <span>Wstawki: {training.attemptsCount}</span>
              </div>
              <TrainingTimelineBar time={training.time} durationMinutes={training.durationMinutes} />
              <button type="button" onClick={() => onEditTraining(training)} className={styles.trainingSidebar__linkButton}>
                Edytuj ten trening
              </button>
            </article>
          ))}
        </div>
      </section>
    </aside>
  );
}
