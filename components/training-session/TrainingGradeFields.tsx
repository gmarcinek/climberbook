"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/climberbook/common/Button";
import { Select } from "@/components/climberbook/common/FormControls";
import { formLayoutClassNames } from "@/components/climberbook/common/FormLayout";
import { InformationModalTrigger } from "@/components/climberbook/common/InformationModal";
import type {
  FacilityRecord,
  RopeRoute,
  TrainingSurface,
} from "@/lib/climbs-db";
import styles from "@/components/training-calendar/TrainingSidebar.module.css";
import type { TrainingDraftValues } from "./types";
import {
  boardGrades,
  boulderGymGrades,
  getGradeChipClassName,
  gradeSurfaceLabels,
  ropeGradeBases,
  ropeGradeModifiers,
  splitDifficultyGrades,
} from "./training-session.utils";

type Props = {
  draft: TrainingDraftValues;
  facilities: FacilityRecord[];
  onDraftChange: (draft: TrainingDraftValues) => void;
};

export function TrainingGradeFields({
  draft,
  facilities,
  onDraftChange,
}: Props) {
  const [selectedRopeBase, setSelectedRopeBase] = useState<string | null>(null);
  const fullFieldClassName = [
    styles.trainingSidebar__field,
    formLayoutClassNames.fullSpan,
  ].join(" ");
  const gradeSurfaces = draft.surfaces.filter(
    (surface) => gradeSurfaceLabels[surface],
  );
  const selectedFacility =
    facilities.find((facility) => facility.id === draft.facilityId) ??
    facilities.find((facility) => facility.name === draft.facilityName);
  const ropeWalls = selectedFacility?.capabilities.ropeWalls ?? [];
  const updateGrades = (surface: TrainingSurface, grades: string[]) =>
    onDraftChange({
      ...draft,
      difficultyBySurface: {
        ...draft.difficultyBySurface,
        [surface]: grades.join(", "),
      },
    });
  const updateRopeRoutes = (ropeRoutes: RopeRoute[]) =>
    onDraftChange({
      ...draft,
      ropeRoutes,
      difficultyBySurface: {
        ...draft.difficultyBySurface,
        lina: ropeRoutes
          .map((route) => route.grade.trim())
          .filter(Boolean)
          .join(", "),
      },
    });

  return (
    <div className={styles.trainingSidebar__formGrid}>
      {gradeSurfaces.map((surface) => {
        const grades = splitDifficultyGrades(
          draft.difficultyBySurface[surface] ?? "",
        );
        const addGrade = (grade: string) =>
          updateGrades(surface, [...grades, grade]);
        const removeGrade = (gradeIndex: number) =>
          updateGrades(
            surface,
            grades.filter((_grade, index) => index !== gradeIndex),
          );

        if (surface === "lina") {
          return (
            <section
              key={surface}
              className={`${fullFieldClassName} ${styles.trainingSidebar__ropeRoutes}`}
            >
              <div className={styles.trainingSidebar__ropeRoutesHeader}>
                <strong className={styles.trainingSidebar__protocolHeading}>
                  Drogi na linie
                </strong>
                <InformationModalTrigger topic="ropeRouteGrades" />
              </div>
              <div className={styles.trainingSidebar__stack}>
                <div className={styles.trainingSidebar__chipGrid}>
                  {ropeGradeBases.map((base) => (
                    <button
                      key={base}
                      type="button"
                      aria-pressed={selectedRopeBase === base}
                      onClick={() => setSelectedRopeBase(base)}
                      className={[
                        styles.trainingSidebar__chip,
                        styles.trainingSidebar__gradeChip,
                        styles[`trainingSidebar__gradeChip--${base}`],
                        selectedRopeBase === base
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
                {selectedRopeBase && (
                  <div className={styles.trainingSidebar__chipGrid}>
                    {ropeGradeModifiers.map((modifier) => {
                      const grade = `${selectedRopeBase}${modifier}`;
                      return (
                        <button
                          key={modifier}
                          type="button"
                          onClick={() =>
                            updateRopeRoutes([
                              ...draft.ropeRoutes,
                              { grade, ropeWallName: "", completed: 1.0 },
                            ])
                          }
                          className={[
                            styles.trainingSidebar__chip,
                            styles.trainingSidebar__gradeChip,
                            getGradeChipClassName(styles, surface, grade),
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
              {draft.ropeRoutes.length ? (
                <div className={styles.trainingSidebar__ropeRouteTableWrap}>
                  <table className={styles.trainingSidebar__ropeRouteTable}>
                    <thead>
                      <tr>
                        <th scope="col">Wycena</th>
                        <th scope="col">Sektor</th>
                        <th
                          scope="col"
                          className={styles.trainingSidebar__ropeRouteVolume}
                        >
                          <span
                            className={
                              styles.trainingSidebar__ropeRouteLabelWithInfo
                            }
                          >
                            Objętość treningowa
                            <InformationModalTrigger topic="trainingVolume" />
                          </span>
                        </th>
                        <th scope="col">
                          <span
                            className={styles.trainingSidebar__visuallyHidden}
                          >
                            Usuń drogę
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.ropeRoutes.map((route, index) => (
                        <tr key={index}>
                          <td>
                            <span
                              className={styles.trainingSidebar__ropeRouteGrade}
                            >
                              {route.grade}
                            </span>
                          </td>
                          <td>
                            <Select
                              aria-label={`Ściana drogi ${index + 1}`}
                              value={route.ropeWallName}
                              disabled={!ropeWalls.length}
                              onChange={(event) =>
                                updateRopeRoutes(
                                  draft.ropeRoutes.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? {
                                          ...item,
                                          ropeWallName: event.target.value,
                                        }
                                      : item,
                                  ),
                                )
                              }
                            >
                              <option value="">
                                {ropeWalls.length
                                  ? "Wybierz ścianę"
                                  : "Brak ścian w obiekcie"}
                              </option>
                              {ropeWalls.map((wall) => (
                                <option key={wall.name} value={wall.name}>
                                  {wall.name}
                                </option>
                              ))}
                            </Select>
                          </td>
                          <td
                            className={styles.trainingSidebar__ropeRouteVolume}
                          >
                            <div
                              className={
                                styles.trainingSidebar__ropeRouteCompletion
                              }
                              aria-label={`Ukończenie drogi ${index + 1}`}
                            >
                              {[0.25, 0.5, 0.75, 1.0].map((completed) => (
                                <button
                                  key={completed}
                                  type="button"
                                  aria-pressed={route.completed === completed}
                                  className={[
                                    styles.trainingSidebar__ropeRouteCompletionButton,
                                    route.completed === completed
                                      ? styles[
                                          "trainingSidebar__ropeRouteCompletionButton--active"
                                        ]
                                      : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                  onClick={() =>
                                    updateRopeRoutes(
                                      draft.ropeRoutes.map((item, itemIndex) =>
                                        itemIndex === index
                                          ? { ...item, completed }
                                          : item,
                                      ),
                                    )
                                  }
                                >
                                  {Math.round(completed * 100)}%
                                </button>
                              ))}
                            </div>
                          </td>
                          <td>
                            <Button
                              type="button"
                              size="small"
                              variant="secondary"
                              aria-label={`Usuń drogę ${index + 1}`}
                              title="Usuń drogę"
                              className={
                                styles.trainingSidebar__ropeRouteDelete
                              }
                              onClick={() =>
                                updateRopeRoutes(
                                  draft.ropeRoutes.filter(
                                    (_route, routeIndex) =>
                                      routeIndex !== index,
                                  ),
                                )
                              }
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={styles.trainingSidebar__helperText}>
                  Wybierz wycenę poniżej, aby dodać drogę.
                </p>
              )}
            </section>
          );
        }

        return (
          <div key={surface} className={fullFieldClassName}>
            <label
              className={`${fullFieldClassName} ${styles.trainingSidebar__protocolHeading}`}
            >
              <span className={styles.trainingSidebar__headingWithInfo}>
                Wyceny - {gradeSurfaceLabels[surface]}
                {surface === "baldy" ? (
                  <InformationModalTrigger topic="boulderGymGrades" />
                ) : surface === "moon" ? (
                  <InformationModalTrigger topic="moonBoardGrades" />
                ) : surface === "kilter" ? (
                  <InformationModalTrigger topic="kilterBoardGrades" />
                ) : null}
              </span>
            </label>
            <div
              className={[
                styles.trainingSidebar__chipGrid,
                surface === "baldy"
                  ? styles.trainingSidebar__boulderGradeChipGrid
                  : "",
                ["moon", "kilter"].includes(surface)
                  ? styles.trainingSidebar__boardGradeChipGrid
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {(surface === "baldy" ? boulderGymGrades : boardGrades).map(
                (grade) => (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => addGrade(grade)}
                    className={[
                      styles.trainingSidebar__chip,
                      styles.trainingSidebar__gradeChip,
                      getGradeChipClassName(styles, surface, grade),
                      grades.includes(grade)
                        ? styles["trainingSidebar__chip--active"]
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {grade}
                  </button>
                ),
              )}
            </div>
            {grades.length > 0 && (
              <div
                className={styles.trainingSidebar__selectedGradeSection}
                aria-label={`Wybrane wyceny: ${gradeSurfaceLabels[surface]}`}
              >
                <span className={styles.trainingSidebar__selectedGradeLabel}>
                  Dodane: {grades.length}
                </span>
                <div className={styles.trainingSidebar__selectedGradeChips}>
                  {grades.map((grade, index) => (
                    <button
                      key={`${grade}-${index}`}
                      type="button"
                      onClick={() => removeGrade(index)}
                      aria-label={`Usuń ${grade} ${index + 1}`}
                      title="Usuń wycenę"
                      className={[
                        styles.trainingSidebar__chip,
                        styles.trainingSidebar__selectedGradeChip,
                        getGradeChipClassName(styles, surface, grade),
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span>{grade}</span>
                      <span
                        className={styles.trainingSidebar__selectedGradeRemove}
                        aria-hidden="true"
                      >
                        ×
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
