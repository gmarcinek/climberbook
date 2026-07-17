import type { ReactNode } from "react";
import {
  metricCardStyle,
  metricValueStyle,
} from "@/components/climberbook/common/styles";

export function MetricCard({
  label,
  value,
  detail,
  action,
  actionLayout = "below",
}: {
  label: string;
  value: string;
  detail: string;
  action?: ReactNode;
  actionLayout?: "below" | "aside";
}) {
  const metricContent = (
    <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
      <span style={{ color: "var(--muted)", fontSize: "0.95rem" }}>
        {label}
      </span>
      <strong style={metricValueStyle}>{value}</strong>
      <span style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
        {detail}
      </span>
    </div>
  );

  return (
    <article style={metricCardStyle}>
      {action && actionLayout === "aside" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: 12,
            alignItems: "center",
          }}
        >
          {metricContent}
          {action}
        </div>
      ) : (
        <>
          {metricContent}
          {action}
        </>
      )}
    </article>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p style={{ margin: 0, color: "var(--muted)" }}>{message}</p>;
}
