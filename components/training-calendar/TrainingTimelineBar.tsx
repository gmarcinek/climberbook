import { CSSProperties } from "react";
import { getTimelinePlacement } from "./training-calendar.helpers";

type TrainingTimelineBarProps = {
  time: string;
  durationMinutes: number;
};

export function TrainingTimelineBar(props: TrainingTimelineBarProps) {
  const { time, durationMinutes } = props;
  const placement = getTimelinePlacement(time, durationMinutes);
  const fillStyle = {
    ...timelineFillStyle,
    ...placement,
    background: getTimelineFillBackground(durationMinutes),
  };

  return (
    <div style={timelineTrackStyle}>
      <div style={fillStyle} />
    </div>
  );
}

function getTimelineFillBackground(durationMinutes: number) {
  if (durationMinutes > 210) {
    return "linear-gradient(90deg, rgba(188, 68, 39, 0.95), rgba(232, 104, 72, 0.95))";
  }

  if (durationMinutes > 150) {
    return "linear-gradient(90deg, rgba(214, 150, 20, 0.95), rgba(239, 190, 56, 0.95))";
  }

  return timelineFillStyle.background;
}

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
