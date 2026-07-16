import Link from "next/link";
import { settingsTabs } from "@/components/climberbook/common/constants";
import type { SettingsTabsWidgetProps } from "./SettingsWidgetTypes";
const settingsTabNavStyle = {
  display: "flex",
  gap: 4,
  flexWrap: "wrap" as const,
  borderBottom: "1px solid var(--border-strong)",
};
const settingsTabButtonStyle = {
  border: 0,
  background: "transparent",
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: "0.9rem",
};
export function SettingsTabsWidget({ settingsTab }: SettingsTabsWidgetProps) {
  return (
    <div style={settingsTabNavStyle}>
      {settingsTabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.route}
          style={{
            ...settingsTabButtonStyle,
            color: settingsTab === tab.key ? "var(--text)" : "var(--muted)",
            fontWeight: settingsTab === tab.key ? 700 : 500,
            borderBottom:
              settingsTab === tab.key
                ? "2px solid var(--accent)"
                : "2px solid transparent",
          }}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
