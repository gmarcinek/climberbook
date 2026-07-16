"use client";

import { Panel } from "@/components/climberbook/common/Panel";
import {
  moduleEyebrowStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import {
  getRopeGradeColor,
  getRopeGradeIndex,
} from "@/components/climberbook/common/training";

type ReportedAscentsListWidgetProps = {
  ascents: Array<{
    id?: number;
    date: string;
    source: "panel" | "skala";
    routeName: string;
    suggestedGrade: string;
    subjectiveGrade: string;
    notes: string;
    createdAt: string;
  }>;
  editingAscentId: number | null;
  onEdit: (ascent: ReportedAscentsListWidgetProps["ascents"][number]) => void;
};

function resolveGradeColor(grade: string) {
  const trimmed = grade.trim();

  if (!trimmed) {
    return "rgba(185, 176, 168, 0.22)";
  }

  if (getRopeGradeIndex(trimmed) >= 0) {
    return getRopeGradeColor(trimmed);
  }

  const fallback = trimmed.match(/\d+[abc]\+?/i)?.[0] ?? "";

  return fallback && getRopeGradeIndex(fallback) >= 0
    ? getRopeGradeColor(fallback)
    : "rgba(185, 176, 168, 0.22)";
}

function getGradeTextColor(background: string) {
  if (!background.startsWith("#") || background.length !== 7) {
    return "var(--text)";
  }

  const red = Number.parseInt(background.slice(1, 3), 16);
  const green = Number.parseInt(background.slice(3, 5), 16);
  const blue = Number.parseInt(background.slice(5, 7), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return luminance < 148 ? "#ffffff" : "#18212b";
}

function renderGradeChip(grade: string) {
  const background = resolveGradeColor(grade);

  return (
    <strong
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 30,
        padding: "4px 10px",
        borderRadius: 999,
        background,
        color: getGradeTextColor(background),
        boxShadow: "inset 0 0 0 1px rgba(24, 33, 43, 0.08)",
      }}
    >
      {grade || "-"}
    </strong>
  );
}

export function ReportedAscentsListWidget({
  ascents,
  editingAscentId,
  onEdit,
}: ReportedAscentsListWidgetProps) {
  return (
    <Panel style={{ width: "100%", minWidth: 0 }}>
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Raporty</span>
          <h2 style={sectionTitleStyle}>Lista zaraportowanych przejść</h2>
        </div>
        <span style={softTagStyle}>{ascents.length} wpisów</span>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {ascents.map((ascent) => {
          const isEditing = ascent.id === editingAscentId;

          return (
            <article
              key={ascent.id ?? `${ascent.date}-${ascent.routeName}`}
              style={{
                display: "grid",
                gap: 10,
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(28, 61, 89, 0.05)",
                border: isEditing
                  ? "1px solid rgba(195, 102, 58, 0.4)"
                  : "1px solid rgba(28, 61, 89, 0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    {ascent.date} ·{" "}
                    {ascent.source === "panel" ? "Panel" : "Skała"}
                  </div>
                  <h3 style={{ margin: 0, fontSize: "1rem" }}>
                    {ascent.routeName}
                  </h3>
                </div>
                <button
                  type="button"
                  style={{
                    border: isEditing
                      ? "1px solid rgba(195, 102, 58, 0.38)"
                      : "1px solid rgba(24, 33, 43, 0.14)",
                    padding: "7px 9px",
                    background: "rgba(255,255,255,0.92)",
                    color: "var(--text)",
                    cursor: "pointer",
                    boxShadow: "0 12px 24px rgba(24, 33, 43, 0.08)",
                  }}
                  onClick={() => onEdit(ascent)}
                >
                  {isEditing ? "Edytujesz" : "Edytuj"}
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ color: "var(--muted)", fontSize: 11 }}>
                    WYCENA
                  </div>
                  {renderGradeChip(ascent.suggestedGrade)}
                </div>
                <div>
                  <div style={{ color: "var(--muted)", fontSize: 11 }}>
                    WYCENA SUBIEKTYWNA
                  </div>
                  {renderGradeChip(ascent.subjectiveGrade)}
                </div>
              </div>
              <div style={{ color: "var(--text)", overflowWrap: "anywhere" }}>
                {ascent.notes?.trim() || "Brak opisu dla tego wpisu."}
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}
