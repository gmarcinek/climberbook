import type { CSSProperties } from "react";
import { getRopeGradeColor, getRopeGradeIndex } from "./training";

type GradeChipSurface = "lina" | "baldy" | "moon" | "kilter";

type GradeChipProps = {
  grade: string;
  endGrade?: string;
  surface?: GradeChipSurface;
};

const boardGradeColors = {
  baldy: ["#b9c2cc", "#7ccb9b", "#48b8a0", "#3b9edb", "#f2c14e", "#f39a3d", "#e76f51", "#c54560", "#343a40"],
  moon: ["#b4b5c5", "#bea3c8", "#c98fca", "#d27bcb", "#d967ca", "#e053c7", "#e63fc3", "#eb2abd", "#ee19b6", "#d75ca2", "#b76589", "#935d76", "#735264", "#5c4757", "#4b404a", "#403b42", "#343a40"],
  kilter: ["#c3c8bd", "#ccd0ad", "#d5d89d", "#dde08d", "#e5e77d", "#ebed6d", "#f0ef5d", "#f3ec4f", "#f5e643", "#f6df37", "#f7d72c", "#f8ce22", "#f9c518", "#fac00f", "#fbc00b", "#fbc609", "#fccc08"],
} as const;

function getBoardGradeColor(
  surface: Exclude<GradeChipSurface, "lina">,
  grade: string,
) {
  const value = Number(/^V(\d+)$/i.exec(grade)?.[1]);
  return Number.isInteger(value) ? boardGradeColors[surface][value - 1] : undefined;
}

function getGradeColor(surface: GradeChipSurface, grade: string) {
  return surface === "lina"
    ? getRopeGradeIndex(grade) >= 0
      ? getRopeGradeColor(grade)
      : undefined
    : getBoardGradeColor(surface, grade);
}

function getTextColor(...colors: string[]) {
  const isDark = colors.some((color) => {
    const red = Number.parseInt(color.slice(1, 3), 16);
    const green = Number.parseInt(color.slice(3, 5), 16);
    const blue = Number.parseInt(color.slice(5, 7), 16);
    return (red * 299 + green * 587 + blue * 114) / 1000 < 148;
  });

  return isDark ? "#ffffff" : "#18212b";
}

export function GradeChip({
  grade,
  endGrade,
  surface = "lina",
}: GradeChipProps) {
  const startColor = getGradeColor(surface, grade);
  const endColor = getGradeColor(surface, endGrade ?? grade);
  const colors = [startColor, endColor].filter(
    (color): color is string => Boolean(color),
  );
  const style: CSSProperties = {
    padding: "4px 6px",
    borderRadius: 6,
    border: "1px solid rgba(24, 33, 43, 0.08)",
    color: colors.length ? getTextColor(...colors) : "var(--text)",
    fontSize: "0.85rem",
    background: startColor && endColor
      ? startColor === endColor
        ? startColor
        : `linear-gradient(90deg, ${startColor}, ${endColor})`
      : "rgba(255, 255, 255, 0.78)",
  };

  return <span style={style}>{endGrade && endGrade !== grade ? `${grade}-${endGrade}` : grade}</span>;
}

export type { GradeChipProps, GradeChipSurface };
