import type { ReactNode } from "react";
import { Panel } from "@/components/climberbook/common/Panel";
import {
  moduleEyebrowStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";

export const analyticsChartGridStyle = {
  stroke: "var(--component-chart-grid)",
  strokeDasharray: "3 5",
};

export const analyticsChartAxisTickStyle = {
  fontSize: 9.6,
  fill: "var(--component-chart-axis)",
};

export function formatAnalyticsDate(value: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T00:00:00`));
}

export function AnalyticsChartPanel({
  eyebrow,
  title,
  badge,
  height = 260,
  embedded = false,
  children,
}: {
  eyebrow: string;
  title: string;
  badge?: string;
  height?: number | string;
  embedded?: boolean;
  children: ReactNode;
}) {
  const content = (
    <>
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>{eyebrow}</span>
          <h2 style={sectionTitleStyle}>{title}</h2>
        </div>
        {badge ? <span style={softTagStyle}>{badge}</span> : null}
      </div>
      <div style={{ height }}>{children}</div>
    </>
  );

  if (embedded) {
    return content;
  }

  return <Panel>{content}</Panel>;
}
