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
        ? difficultyBySurface?.lina ||
          (surfaces.includes("lina") ? difficultyNotes : "")
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
  "5a": "var(--grade-rope-5a)",
  "5a+": "var(--grade-rope-5a-plus)",
  "5b": "var(--grade-rope-5b)",
  "5b+": "var(--grade-rope-5b-plus)",
  "5c": "var(--grade-rope-5c)",
  "5c+": "var(--grade-rope-5c-plus)",
  "6a": "var(--grade-rope-6a)",
  "6a+": "var(--grade-rope-6a-plus)",
  "6b": "var(--grade-rope-6b)",
  "6b+": "var(--grade-rope-6b-plus)",
  "6c": "var(--grade-rope-6c)",
  "6c+": "var(--grade-rope-6c-plus)",
  "7a": "var(--grade-rope-7a)",
  "7a+": "var(--grade-rope-7a-plus)",
  "7b": "var(--grade-rope-7b)",
  "7b+": "var(--grade-rope-7b-plus)",
  "7c": "var(--grade-rope-7c)",
  "7c+": "var(--grade-rope-7c-plus)",
  "8a": "var(--grade-rope-8a)",
  "8a+": "var(--grade-rope-8a-plus)",
  "8b": "var(--grade-rope-8b)",
  "8b+": "var(--grade-rope-8b-plus)",
  "8c": "var(--grade-rope-8c)",
  "8c+": "var(--grade-rope-8c-plus)",
};

const timelineTrackStyle: CSSProperties = {
  position: "relative",
  height: "var(--component-training-timeline-height, 10px)",
  borderRadius: "var(--component-training-timeline-radius, 999px)",
  background: "var(--component-training-timeline-track)",
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
  borderRadius: "var(--component-training-timeline-radius, 999px)",
  background: "var(--component-training-timeline-fill)",
  minWidth: 8,
};

const timelineSurfaceLabels = {
  lina: "Lina",
  moon: "Moon",
  kilter: "Kilter",
  baldy: "Baldy",
  drazek: "Drążek",
  spraywall: "Spray",
  silownia: "Siłka",
  chwytotablica: "Chwytotablica",
  campus: "Campus",
  bieznia: "Bieżnia",
  rower: "Rower",
  bieg: "Bieg",
  treking: "Treck",
} as const;

const moonGradeColors = [
  "var(--grade-moon-v0)",
  "var(--grade-moon-v1)",
  "var(--grade-moon-v2)",
  "var(--grade-moon-v3)",
  "var(--grade-moon-v4)",
  "var(--grade-moon-v5)",
  "var(--grade-moon-v6)",
  "var(--grade-moon-v7)",
  "var(--grade-moon-v8)",
  "var(--grade-moon-v9)",
  "var(--grade-moon-v10)",
  "var(--grade-moon-v11)",
  "var(--grade-moon-v12)",
  "var(--grade-moon-v13)",
  "var(--grade-moon-v14)",
  "var(--grade-moon-v15)",
  "var(--grade-moon-v16)",
  "var(--grade-moon-v17)",
];
const kilterGradeColors = [
  "var(--grade-kilter-v0)",
  "var(--grade-kilter-v1)",
  "var(--grade-kilter-v2)",
  "var(--grade-kilter-v3)",
  "var(--grade-kilter-v4)",
  "var(--grade-kilter-v5)",
  "var(--grade-kilter-v6)",
  "var(--grade-kilter-v7)",
  "var(--grade-kilter-v8)",
  "var(--grade-kilter-v9)",
  "var(--grade-kilter-v10)",
  "var(--grade-kilter-v11)",
  "var(--grade-kilter-v12)",
  "var(--grade-kilter-v13)",
  "var(--grade-kilter-v14)",
  "var(--grade-kilter-v15)",
  "var(--grade-kilter-v16)",
  "var(--grade-kilter-v17)",
];
const boulderGradeColors = [
  "var(--grade-boulder-v1)",
  "var(--grade-boulder-v2)",
  "var(--grade-boulder-v3)",
  "var(--grade-boulder-v4)",
  "var(--grade-boulder-v5)",
  "var(--grade-boulder-v6)",
  "var(--grade-boulder-v7)",
  "var(--grade-boulder-v8)",
  "var(--grade-boulder-v9)",
];
