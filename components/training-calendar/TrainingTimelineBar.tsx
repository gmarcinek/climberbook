import { CSSProperties } from "react";
import { getTimelinePlacement } from "./training-calendar.helpers";

type TrainingTimelineBarProps = {
  time: string;
  durationMinutes: number;
  difficultyNotes: string;
};

export function TrainingTimelineBar(props: TrainingTimelineBarProps) {
  const { time, durationMinutes, difficultyNotes } = props;
  const placement = getTimelinePlacement(time, durationMinutes);
  const fillStyle = {
    ...timelineFillStyle,
    ...placement,
    background: getTimelineFillBackground(difficultyNotes),
  };

  return (
    <div style={timelineTrackStyle}>
      <div style={fillStyle} />
    </div>
  );
}

function getTimelineFillBackground(difficultyNotes: string) {
  const gradeColors = difficultyNotes
    .split(",")
    .map((grade) => gradeColorByGrade[grade.trim()])
    .filter((color): color is string => Boolean(color));

  if (gradeColors.length === 0) {
    return timelineFillStyle.background;
  }

  const segmentSize = 100 / gradeColors.length;
  const colorStops = gradeColors.flatMap((color, index) => {
    const start = index * segmentSize;
    const end = start + segmentSize;
    return [`${color} ${start}%`, `${color} ${end}%`];
  });

  return `linear-gradient(90deg, ${colorStops.join(", ")})`;
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
