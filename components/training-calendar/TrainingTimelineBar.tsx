import { CSSProperties } from "react";
import { getTimelinePlacement } from "./training-calendar.helpers";

type TrainingTimelineBarProps = {
  time: string;
  durationMinutes: number;
};

export function TrainingTimelineBar(props: TrainingTimelineBarProps) {
  const { time, durationMinutes } = props;
  const placement = getTimelinePlacement(time, durationMinutes);

  return (
    <div style={timelineTrackStyle}>
      <div style={{ ...timelineFillStyle, ...placement }} />
    </div>
  );
}

const timelineTrackStyle: CSSProperties = {
  position: "relative",
  height: 10,
  borderRadius: 999,
  background: "linear-gradient(90deg, rgba(17, 34, 57, 0.12), rgba(17, 34, 57, 0.04))",
  overflow: "hidden",
};

const timelineFillStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  bottom: 0,
  borderRadius: 999,
  background: "linear-gradient(90deg, rgba(13, 85, 152, 0.95), rgba(21, 155, 151, 0.95))",
  minWidth: 8,
};