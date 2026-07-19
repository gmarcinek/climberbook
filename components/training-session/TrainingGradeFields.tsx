"use client";

import { useState } from "react";
import { InputActionControl } from "@/components/climberbook/common/FormControls";
import { formControlClassNames } from "@/components/climberbook/common/FormControls";
import { formLayoutClassNames } from "@/components/climberbook/common/FormLayout";
import type { TrainingSurface } from "@/lib/climbs-db";
import styles from "@/components/training-calendar/TrainingSidebar.module.css";
import type { TrainingDraftValues } from "./types";
import { boardGrades, boulderGymGrades, getGradeChipClassName, gradeSurfaceLabels, ropeGradeBases, ropeGradeModifiers, splitDifficultyGrades } from "./training-session.utils";

type Props = { draft: TrainingDraftValues; onDraftChange: (draft: TrainingDraftValues) => void };

export function TrainingGradeFields({ draft, onDraftChange }: Props) {
  const [expandedSurface, setExpandedSurface] = useState<TrainingSurface | null>(null);
  const [selectedRopeBase, setSelectedRopeBase] = useState<string | null>(null);
  const fullFieldClassName = [styles.trainingSidebar__field, formLayoutClassNames.fullSpan].join(" ");
  const gradeSurfaces = draft.surfaces.filter((surface) => gradeSurfaceLabels[surface]);
  const updateGrades = (surface: TrainingSurface, grades: string[]) => onDraftChange({ ...draft, difficultyBySurface: { ...draft.difficultyBySurface, [surface]: grades.join(", ") } });

  return <div className={styles.trainingSidebar__formGrid}>{gradeSurfaces.map((surface) => {
    const isExpanded = expandedSurface === surface;
    const grades = splitDifficultyGrades(draft.difficultyBySurface[surface] ?? "");
    const addGrade = (grade: string) => updateGrades(surface, [...grades, grade]);
    return <div key={surface} className={fullFieldClassName}>
      <label className={`${fullFieldClassName} ${styles.trainingSidebar__protocolHeading}`}>
        Wyceny - {gradeSurfaceLabels[surface]}
        <InputActionControl value={draft.difficultyBySurface[surface] ?? ""} readOnly placeholder={surface === "lina" ? "Kliknij, aby wybrać wyceny" : surface === "baldy" ? "Skala boulderowni 1-9" : "Skala V1-V10"} onClick={() => { setSelectedRopeBase(null); setExpandedSurface(isExpanded ? null : surface); }} className={styles.trainingSidebar__input} action={<button type="button" aria-label={`Wyczyść wyceny: ${gradeSurfaceLabels[surface]}`} title="Wyczyść wyceny" onMouseDown={(event) => event.preventDefault()} onClick={(event) => { event.stopPropagation(); updateGrades(surface, []); }} className={formControlClassNames.trailingAction}>X</button>} />
      </label>
      {isExpanded && surface === "lina" && <div className={styles.trainingSidebar__stack}>
        <div className={styles.trainingSidebar__chipGrid}>{ropeGradeBases.map((base) => <button key={base} type="button" aria-pressed={selectedRopeBase === base} onClick={() => setSelectedRopeBase(base)} className={[styles.trainingSidebar__chip, styles.trainingSidebar__gradeChip, styles[`trainingSidebar__gradeChip--${base}`], selectedRopeBase === base ? styles["trainingSidebar__chip--active"] : ""].filter(Boolean).join(" ")}>{base}</button>)}</div>
        {selectedRopeBase && <div className={styles.trainingSidebar__chipGrid}>{ropeGradeModifiers.map((modifier) => { const grade = `${selectedRopeBase}${modifier}`; return <button key={modifier} type="button" onClick={() => addGrade(grade)} className={[styles.trainingSidebar__chip, styles.trainingSidebar__gradeChip, getGradeChipClassName(styles, surface, grade)].filter(Boolean).join(" ")}>{modifier}</button>; })}</div>}
      </div>}
      {isExpanded && surface !== "lina" && <div className={styles.trainingSidebar__chipGrid}>{(surface === "baldy" ? boulderGymGrades : boardGrades).map((grade) => <button key={grade} type="button" onClick={() => addGrade(grade)} className={[styles.trainingSidebar__chip, styles.trainingSidebar__gradeChip, getGradeChipClassName(styles, surface, grade), grades.includes(grade) ? styles["trainingSidebar__chip--active"] : ""].filter(Boolean).join(" ")}>{grade}</button>)}</div>}
    </div>;
  })}</div>;
}