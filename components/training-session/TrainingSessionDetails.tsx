"use client";

import { useState } from "react";
import {
  formControlClassNames,
  Input,
  NumericRangeControl,
  NumericStepperControl,
  Select,
} from "@/components/climberbook/common/FormControls";
import type { TrainingSurface } from "@/lib/climbs-db";
import styles from "@/components/training-calendar/TrainingSidebar.module.css";
import type { SurfaceOption, TrainingDraftValues } from "./types";
import { adjustCaloriesValue, getSurfaceOptionGroups, timeOptions } from "./training-session.utils";

const surfaceEmojis: Record<TrainingSurface, string> = {
  lina: "🧗",
  baldy: "🪨",
  moon: "🌙",
  kilter: "💡",
  spraywall: "🎨",
  chwytotablica: "🖐️",
  campus: "🪜",
  drazek: "💪",
  silownia: "🏋️",
  bieznia: "🏃",
  rower: "🚴",
  bieg: "👟",
  treking: "🥾",
};

type Props = {
  draft: TrainingDraftValues;
  surfaceOptions: SurfaceOption[];
  onDraftChange: (draft: TrainingDraftValues) => void;
  onToggleSurface: (surface: TrainingSurface) => void;
};

export function TrainingSessionDetails({
  draft,
  surfaceOptions,
  onDraftChange,
  onToggleSurface,
}: Props) {
  const [isCustomSessionExpanded, setIsCustomSessionExpanded] = useState(false);
  const groups = getSurfaceOptionGroups(surfaceOptions);
  const update = (changes: Partial<TrainingDraftValues>) =>
    onDraftChange({ ...draft, ...changes });
  const renderSurfaceOptions = (options: SurfaceOption[]) =>
    options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onToggleSurface(option.value)}
        className={[
          styles.trainingSidebar__chip,
          styles.trainingSidebar__sessionChip,
          draft.surfaces.includes(option.value)
            ? styles["trainingSidebar__chip--active"]
            : "",
        ].filter(Boolean).join(" ")}
        aria-label={option.label}
      >
        <span className={styles.trainingSidebar__sessionChipIcon} aria-hidden="true">
          {surfaceEmojis[option.value]}
        </span>
        <span>{option.label}</span>
      </button>
    ));

  return (
    <div className={`${styles.trainingSidebar__stack} ${styles.trainingSidebar__formSectionStack}`}>
      <div className={styles.trainingSidebar__stack}>
        <strong className={styles.trainingSidebar__protocolHeading}>Rodzaj sesji</strong>
        <div className={styles.trainingSidebar__chipGrid}>{renderSurfaceOptions(groups.primary)}</div>
        <div className={styles.trainingSidebar__chipGrid}>{renderSurfaceOptions(groups.secondary)}</div>
        <div className={styles.trainingSidebar__chipGrid}>
          {renderSurfaceOptions(groups.remaining)}
          <button
            type="button"
            aria-expanded={isCustomSessionExpanded || Boolean(draft.customSessionType)}
            onClick={() => setIsCustomSessionExpanded((expanded) => !expanded)}
            className={[
              styles.trainingSidebar__chip,
              styles.trainingSidebar__sessionChip,
              isCustomSessionExpanded || draft.customSessionType
                ? styles["trainingSidebar__chip--active"]
                : "",
            ].filter(Boolean).join(" ")}
          >
            <span className={styles.trainingSidebar__sessionChipIcon} aria-hidden="true">✨</span>
            <span>Inne</span>
          </button>
        </div>
        {(isCustomSessionExpanded || draft.customSessionType) && (
          <label className={styles.trainingSidebar__field}>
            Inne
            <Input value={draft.customSessionType} onChange={(event) => update({ customSessionType: event.target.value })} placeholder="Np. mobility, joga, regeneracja" className={styles.trainingSidebar__input} />
          </label>
        )}
      </div>
      <div className={styles.trainingSidebar__formGrid}>
        <label className={styles.trainingSidebar__field}>
          Data
          <Input value={draft.date} onChange={(event) => update({ date: event.target.value })} type="date" required className={styles.trainingSidebar__input} />
        </label>
        <label className={styles.trainingSidebar__field}>
          Godzina
          <Select value={draft.time} onChange={(event) => update({ time: event.target.value })} required className={styles.trainingSidebar__input}>
            {timeOptions.map((time) => <option key={time} value={time}>{time}</option>)}
          </Select>
        </label>
        <label className={styles.trainingSidebar__field}>
          Czas (min)
          <NumericRangeControl value={draft.durationMinutes} onChange={(event) => update({ durationMinutes: event.target.value })} min="15" max="300" step="15" ariaLabel="Długość treningu w minutach" valueLabel={`${draft.durationMinutes} min`} className={styles.trainingSidebar__durationControl} />
        </label>
        <label className={styles.trainingSidebar__field}>
          Kalorie
          <NumericStepperControl
            value={draft.caloriesBurned}
            onChange={(event) => update({ caloriesBurned: event.target.value, caloriesMode: "manual" })}
            onDecrement={() => update({ caloriesBurned: adjustCaloriesValue(draft.caloriesBurned, -100), caloriesMode: "manual" })}
            onIncrement={() => update({ caloriesBurned: adjustCaloriesValue(draft.caloriesBurned, 100), caloriesMode: "manual" })}
            decrementAriaLabel="Odejmij 100 kalorii"
            incrementAriaLabel="Dodaj 100 kalorii"
            decrementTitle="Odejmij 100 kalorii"
            incrementTitle="Dodaj 100 kalorii"
            trailingActions={<button type="button" onClick={() => update({ caloriesBurned: "", caloriesMode: "auto" })} className={formControlClassNames.stepButton}>Auto</button>}
            inputProps={{ placeholder: "Auto z wagi, wieku i czasu", type: "number" }}
            className={styles.trainingSidebar__controlGroup}
          />
        </label>
      </div>
    </div>
  );
}