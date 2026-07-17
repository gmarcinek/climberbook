"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Panel } from "@/components/climberbook/common/Panel";
import {
  inputStyle,
  moduleEyebrowStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import {
  getRopeGradeColor,
  getRopeGradeIndex,
} from "@/components/climberbook/common/training";
import { useViewport } from "@/components/climberbook/hooks/useViewport";
import type { AscentRecord } from "@/lib/climbs-db";

type ReportedAscentsListWidgetProps = {
  ascents: AscentRecord[];
  editingAscentId: number | null;
  onEdit: (ascent: AscentRecord) => void;
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
  const { isMobileHeader } = useViewport();
  const [searchQuery, setSearchQuery] = useState("");
  const searchAnchorRef = useRef<HTMLDivElement>(null);
  const [isSearchPinned, setIsSearchPinned] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [searchBounds, setSearchBounds] = useState<{
    left: number;
    width: number;
  } | null>(null);
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase("pl-PL");
  const visibleAscents = normalizedQuery
    ? ascents.filter((ascent) =>
        [ascent.routeName, ascent.suggestedGrade, ascent.subjectiveGrade].some(
          (value) => value.toLocaleLowerCase("pl-PL").includes(normalizedQuery),
        ),
      )
    : ascents;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isMobileHeader) {
      setIsSearchPinned(false);
      return;
    }

    const updateSearchPosition = () => {
      const anchor = searchAnchorRef.current;

      if (!anchor) {
        return;
      }

      const { left, top, width } = anchor.getBoundingClientRect();

      setIsSearchPinned(top <= 8);
      setSearchBounds((current) =>
        current?.left === left && current.width === width
          ? current
          : { left, width },
      );
    };

    updateSearchPosition();
    window.addEventListener("scroll", updateSearchPosition, { passive: true });
    window.addEventListener("resize", updateSearchPosition);

    return () => {
      window.removeEventListener("scroll", updateSearchPosition);
      window.removeEventListener("resize", updateSearchPosition);
    };
  }, [isMobileHeader]);

  const searchInput = (
    <input
      type="search"
      value={searchQuery}
      onChange={(event) => setSearchQuery(event.target.value)}
      placeholder="Szukaj po nazwie lub wycenie"
      aria-label="Szukaj przejść po nazwie lub wycenie"
      style={inputStyle}
    />
  );

  return (
    <Panel
      style={{
        width: "100%",
        minWidth: 0,
        padding: isMobileHeader ? "1rem 0rem" : undefined,
      }}
    >
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Raporty</span>
          <h2 style={sectionTitleStyle}>Lista zaraportowanych przejść</h2>
        </div>
        <span style={softTagStyle}>
          {visibleAscents.length} z {ascents.length} wpisów
        </span>
      </div>
      <div
        ref={searchAnchorRef}
        style={{
          minHeight: 47,
        }}
      >
        {isSearchPinned ? null : searchInput}
      </div>
      {isClient && isMobileHeader && isSearchPinned && searchBounds
        ? createPortal(
            <div
              style={{
                position: "fixed",
                top: 8,
                left: searchBounds.left,
                width: searchBounds.width,
                zIndex: 20,
                background: "rgb(255, 250, 243)",
                boxShadow: "0 6px 14px rgba(72, 49, 33, 0.14)",
              }}
            >
              {searchInput}
            </div>,
            document.body,
          )
        : null}
      <div style={{ display: "grid", gap: 10 }}>
        {visibleAscents.length === 0 ? (
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Brak przejść pasujących do wyszukiwania.
          </p>
        ) : null}
        {visibleAscents.map((ascent) => {
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
                    {ascent.style?.trim()
                      ? `${ascent.style.trim().toUpperCase()} - ${ascent.routeName}`
                      : ascent.routeName}
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
