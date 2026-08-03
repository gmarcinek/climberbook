import type { CSSProperties } from "react";
import { getRopeGradeColor, getRopeGradeIndex } from "./training";

type GradeChipSurface = "lina" | "baldy" | "moon" | "kilter";

type GradeChipProps = {
  grade: string;
  endGrade?: string;
  surface?: GradeChipSurface;
};

const boardGradeColors = {
  baldy: Array.from(
    { length: 9 },
    (_value, index) => `var(--grade-boulder-v${index + 1})`,
  ),
  moon: Array.from(
    { length: 17 },
    (_value, index) => `var(--grade-moon-v${index + 1})`,
  ),
  kilter: Array.from(
    { length: 17 },
    (_value, index) => `var(--grade-kilter-v${index + 1})`,
  ),
} as const;

function getBoardGradeColor(
  surface: Exclude<GradeChipSurface, "lina">,
  grade: string,
) {
  const value = Number(/^V(\d+)$/i.exec(grade)?.[1]);
  return Number.isInteger(value)
    ? boardGradeColors[surface][value - 1]
    : undefined;
}

function getGradeColor(surface: GradeChipSurface, grade: string) {
  return surface === "lina"
    ? getRopeGradeIndex(grade) >= 0
      ? getRopeGradeColor(grade)
      : undefined
    : getBoardGradeColor(surface, grade);
}

export function GradeChip({
  grade,
  endGrade,
  surface = "lina",
}: GradeChipProps) {
  const startColor = getGradeColor(surface, grade);
  const endColor = getGradeColor(surface, endGrade ?? grade);
  const colors = [startColor, endColor].filter((color): color is string =>
    Boolean(color),
  );
  const style: CSSProperties = {
    padding: "4px 6px",
    borderRadius: 6,
    border: "1px solid rgba(24, 33, 43, 0.08)",
    color: colors.length ? "var(--component-grade-chip-text)" : "var(--text)",
    fontSize: "0.85rem",
    background:
      startColor && endColor
        ? startColor === endColor
          ? startColor
          : `linear-gradient(90deg, ${startColor}, ${endColor})`
        : "rgba(255, 255, 255, 0.78)",
  };

  return (
    <span style={style}>
      {endGrade && endGrade !== grade ? `${grade}-${endGrade}` : grade}
    </span>
  );
}

export type { GradeChipProps, GradeChipSurface };
