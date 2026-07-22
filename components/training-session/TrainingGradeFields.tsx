"use client";

import { useState } from "react";
import { formControlClassNames } from "@/components/climberbook/common/FormControls";
import { formLayoutClassNames } from "@/components/climberbook/common/FormLayout";
import type { TrainingSurface } from "@/lib/climbs-db";
import styles from "@/components/training-calendar/TrainingSidebar.module.css";
import type { TrainingDraftValues } from "./types";
import { boardGrades, boulderGymGrades, getGradeChipClassName, gradeSurfaceLabels, ropeGradeBases, ropeGradeModifiers, splitDifficultyGrades } from "./training-session.utils";

type Props = { draft: TrainingDraftValues; onDraftChange: (draft: TrainingDraftValues) => void };

export function TrainingGradeFields({ draft, onDraftChange }: Props) {
  const [selectedRopeBase, setSelectedRopeBase] = useState<string | null>(null);
  const fullFieldClassName = [styles.trainingSidebar__field, formLayoutClassNames.fullSpan].join(" ");
  const gradeSurfaces = draft.surfaces.filter((surface) => gradeSurfaceLabels[surface]);
  const updateGrades = (surface: TrainingSurface, grades: string[]) => onDraftChange({ ...draft, difficultyBySurface: { ...draft.difficultyBySurface, [surface]: grades.join(", ") } });

  return <div className={styles.trainingSidebar__formGrid}>{gradeSurfaces.map((surface) => {
    const grades = splitDifficultyGrades(draft.difficultyBySurface[surface] ?? "");
    const addGrade = (grade: string) => updateGrades(surface, [...grades, grade]);
    const removeGrade = (gradeIndex: number) =>
      updateGrades(surface, grades.filter((_grade, index) => index !== gradeIndex));

    return <div key={surface} className={fullFieldClassName}>
      <label className={`${fullFieldClassName} ${styles.trainingSidebar__protocolHeading}`}>
        Wyceny - {gradeSurfaceLabels[surface]}
        <div
          className={[formControlClassNames.control, styles.trainingSidebar__selectedGrades].join(" ")}
        >
          {grades.length ? grades.map((grade, index) => (
            <button
              key={`${grade}-${index}`}
              type="button"
              className={[
                styles.trainingSidebar__chip,
                styles.trainingSidebar__gradeChip,
                styles.trainingSidebar__selectedGradeChip,
                getGradeChipClassName(styles, surface, grade),
              ].filter(Boolean).join(" ")}
              aria-label={`Usuń wycenę ${grade}`}
              title={`Usuń ${grade}`}
              onClick={(event) => {
                event.stopPropagation();
                removeGrade(index);
              }}
            >
              <span>{grade}</span>
              <span aria-hidden="true">×</span>
            </button>
          )) : (
            <span className={styles.trainingSidebar__selectedGradesPlaceholder}>
              Kliknij, aby wybrać wyceny
            </span>
          )}
        </div>
      </label>
      {surface === "lina" && <div className={styles.trainingSidebar__stack}>
        <div className={styles.trainingSidebar__chipGrid}>{ropeGradeBases.map((base) => <button key={base} type="button" aria-pressed={selectedRopeBase === base} onClick={() => setSelectedRopeBase(base)} className={[styles.trainingSidebar__chip, styles.trainingSidebar__gradeChip, styles[`trainingSidebar__gradeChip--${base}`], selectedRopeBase === base ? styles["trainingSidebar__chip--active"] : ""].filter(Boolean).join(" ")}>{base}</button>)}</div>
        {selectedRopeBase && <div className={styles.trainingSidebar__chipGrid}>{ropeGradeModifiers.map((modifier) => { const grade = `${selectedRopeBase}${modifier}`; return <button key={modifier} type="button" onClick={() => addGrade(grade)} className={[styles.trainingSidebar__chip, styles.trainingSidebar__gradeChip, getGradeChipClassName(styles, surface, grade)].filter(Boolean).join(" ")}>{modifier}</button>; })}</div>}
      </div>}
      {surface !== "lina" && <div className={[styles.trainingSidebar__chipGrid, surface === "baldy" ? styles.trainingSidebar__boulderGradeChipGrid : "", ["moon", "kilter"].includes(surface) ? styles.trainingSidebar__boardGradeChipGrid : ""].filter(Boolean).join(" ")}>{(surface === "baldy" ? boulderGymGrades : boardGrades).map((grade) => <button key={grade} type="button" onClick={() => addGrade(grade)} className={[styles.trainingSidebar__chip, styles.trainingSidebar__gradeChip, getGradeChipClassName(styles, surface, grade), grades.includes(grade) ? styles["trainingSidebar__chip--active"] : ""].filter(Boolean).join(" ")}>{grade}</button>)}</div>}
    </div>;
  })}</div>;
}