import { CSSProperties } from "react";
import type { TrainingSurface } from "@/lib/climbs-db";
import { getTimelinePlacement } from "./training-calendar.helpers";

type TrainingTimelineBarProps = {
  time: string;
  durationMinutes: number;
  difficultyNotes: string;
  difficultyBySurface?: Partial<Record<TrainingSurface, string>>;
  surfaces?: TrainingSurface[];
};

export function TrainingTimelineBar(props: TrainingTimelineBarProps) {
  const {
    time,
    durationMinutes,
    difficultyNotes,
    difficultyBySurface,
    surfaces,
  } = props;
  const placement = getTimelinePlacement(time, durationMinutes);
  const gradeRows = getTimelineGradeRows(
    difficultyNotes,
    difficultyBySurface,
    surfaces,
  );

  return (
    <div style={timelineRowsStyle}>
      {gradeRows.map((row) => (
        <div key={row.surface ?? "session"} style={timelineRowStyle}>
          <span style={timelineLabelStyle}>
            {row.surface ? timelineSurfaceLabels[row.surface] : "Czas"}
          </span>
          <div style={timelineTrackStyle}>
            <div
              style={{
                ...timelineFillStyle,
                ...placement,
                background: getTimelineFillBackground(row.colors),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function getTimelineGradeRows(
  difficultyNotes: string,
  difficultyBySurface?: Partial<Record<TrainingSurface, string>>,
  surfaces: TrainingSurface[] = [],
) {
  const gradingSurfaces = ["moon", "lina", "kilter", "baldy"] as const;
  const visibleSurfaces = [
    ...surfaces,
    ...gradingSurfaces.filter((surface) =>
      surface === "lina"
        ? Boolean(
            difficultyBySurface?.lina ||
              (surfaces.includes("lina") && difficultyNotes),
          )
        : Boolean(difficultyBySurface?.[surface]),
    ),
  ].filter(
    (surface, index, allSurfaces) => allSurfaces.indexOf(surface) === index,
  );
  const rows = visibleSurfaces.map((surface) => {
    const isGradingSurface = gradingSurfaces.includes(
      surface as (typeof gradingSurfaces)[number],
    );
    const gradeValue =
      surface === "lina"
        ? (difficultyBySurface?.lina ||
          (surfaces.includes("lina") ? difficultyNotes : ""))
        : (difficultyBySurface?.[surface] ?? "");

    return {
      surface,
      colors: isGradingSurface
        ? getGradeColors(
            surface as (typeof gradingSurfaces)[number],
            gradeValue,
          )
        : [],
    };
  });

  return rows.length > 0 ? rows : [{ surface: null, colors: [] }];
}

function getTimelineFillBackground(colors: string[]) {
  if (colors.length === 0) {
    return timelineFillStyle.background;
  }

  const segmentSize = 100 / colors.length;
  const colorStops = colors.flatMap((color, index) => {
    const start = index * segmentSize;
    const end = start + segmentSize;
    return [`${color} ${start}%`, `${color} ${end}%`];
  });

  return `linear-gradient(90deg, ${colorStops.join(", ")})`;
}

function getGradeColors(
  surface: "moon" | "lina" | "kilter" | "baldy",
  gradeValue: string,
) {
  return gradeValue
    .split(",")
    .map((grade) => grade.trim())
    .map((grade) => {
      if (surface === "lina") {
        return gradeColorByGrade[grade] ?? null;
      }

      if (surface === "baldy") {
        return boulderGradeColors[Number(grade) - 1] ?? null;
      }

      const gradeIndex = Number(/^V(\d+)$/.exec(grade)?.[1]);
      const colors = surface === "moon" ? moonGradeColors : kilterGradeColors;
      return colors[gradeIndex] ?? null;
    })
    .filter((color): color is string => Boolean(color));
}

const gradeColorByGrade: Record<string, string> = {
  "5a": "#a8dd9a",
  "5a+": "#aceb96",
  "5b": "#79d66a",
  "5b+": "#4ab34d",
  "5c": "#288e38",
  "5c+": "#176729",
  "6a": "#e8d353",
  "6a+": "#ffe46f",
  "6b": "#ffcf3f",
  "6b+": "#ffaf1f",
  "6c": "#ee8914",
  "6c+": "#cb5f0d",
  "7a": "#83cde7",
  "7a+": "#86d8f6",
  "7b": "#4abce7",
  "7b+": "#218fce",
  "7c": "#1765ac",
  "7c+": "#103d78",
  "8a": "#ec8dc2",
  "8a+": "#f59acc",
  "8b": "#df6eb8",
  "8b+": "#bd499e",
  "8c": "#913181",
  "8c+": "#642060",
};

const timelineTrackStyle: CSSProperties = {
  position: "relative",
  height: 10,
  borderRadius: 999,
  background:
    "linear-gradient(90deg, rgba(17, 34, 57, 0.12), rgba(17, 34, 57, 0.04))",
  overflow: "hidden",
};

const timelineRowsStyle: CSSProperties = {
  display: "grid",
  gap: 3,
};

const timelineRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  gap: 6,
  alignItems: "center",
};

const timelineLabelStyle: CSSProperties = {
  width: 80,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: "var(--muted)",
  fontSize: "0.68rem",
  lineHeight: 1,
};

const timelineFillStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  bottom: 0,
  left: 0,
  borderRadius: 999,
  background:
    "linear-gradient(90deg, rgba(13, 85, 152, 0.95), rgba(21, 155, 151, 0.95))",
  minWidth: 8,
};

const timelineSurfaceLabels = {
  lina: "Lina",
  moon: "Moon",
  kilter: "Kilter",
  baldy: "Baldy",
  drazek: "Drążek",
  spraywall: "Spraywall",
  silownia: "Siłownia",
  chwytotablica: "Chwytotablica",
  campus: "Campus",
  bieznia: "Bieżnia",
  rower: "Rower",
  bieg: "Bieg",
  treking: "Treking",
} as const;

const moonGradeColors = [
  "#b9c2cc",
  "#b4b5c5",
  "#bea3c8",
  "#c98fca",
  "#d27bcb",
  "#d967ca",
  "#e053c7",
  "#e63fc3",
  "#eb2abd",
  "#ee19b6",
  "#d75ca2",
  "#b76589",
  "#935d76",
  "#735264",
  "#5c4757",
  "#4b404a",
  "#403b42",
  "#343a40",
];
const kilterGradeColors = [
  "#b9c2cc",
  "#c3c8bd",
  "#ccd0ad",
  "#d5d89d",
  "#dde08d",
  "#e5e77d",
  "#ebed6d",
  "#f0ef5d",
  "#f3ec4f",
  "#f5e643",
  "#f6df37",
  "#f7d72c",
  "#f8ce22",
  "#f9c518",
  "#fac00f",
  "#fbc00b",
  "#fbc609",
  "#fccc08",
];
const boulderGradeColors = [
  "#b9c2cc",
  "#7ccb9b",
  "#48b8a0",
  "#3b9edb",
  "#f2c14e",
  "#f39a3d",
  "#e76f51",
  "#c54560",
  "#343a40",
];
