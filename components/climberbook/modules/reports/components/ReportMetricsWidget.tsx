"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { MetricCard } from "@/components/climberbook/common/charts";
import { Stack } from "@/components/climberbook/common/Stack";
import { useViewport } from "@/components/climberbook/hooks/useViewport";
import type { AscentCsvImportPreview } from "@/components/climberbook/providers/ClimberbookProvider";
import {
  deleteButtonStyle,
  ghostButtonStyle,
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  secondaryButtonStyle,
  sectionTitleStyle,
  statsGridStyle,
  weightEntryModalOverlayStyle,
  weightEntryModalStyle,
} from "@/components/climberbook/common/styles";
type ReportMetricsWidgetProps = {
  ascentsCount: number;
  panelAscents: number;
  rockAscents: number;
  importMessage: string;
  onCsvImport: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  importPreview: AscentCsvImportPreview | null;
  isImporting: boolean;
  imported8aNuAscentsCount: number;
  onConfirmImport: (includeOtherStyles: boolean) => Promise<void>;
  onCloseImportPreview: () => void;
  onDelete8aNuAscents: () => Promise<void>;
};
export function ReportMetricsWidget({
  ascentsCount,
  panelAscents,
  rockAscents,
  importMessage,
  onCsvImport,
  importPreview,
  isImporting,
  imported8aNuAscentsCount,
  onConfirmImport,
  onCloseImportPreview,
  onDelete8aNuAscents,
}: ReportMetricsWidgetProps) {
  const { width, isMobileChartLayout } = useViewport();
  const isTabletReportLayout = width > 0 && width < 1024;
  const [isDelete8aNuModalOpen, setIsDelete8aNuModalOpen] = useState(false);
  const [includeOtherStyles, setIncludeOtherStyles] = useState(false);
  const visibleSkippedRows = importPreview
    ? importPreview.skippedAscentRows.filter(
        (row) => !includeOtherStyles || !row.canImportWhenSelected,
      )
    : [];

  useEffect(() => {
    setIncludeOtherStyles(false);
  }, [importPreview]);

  async function handleDelete8aNuAscents() {
    await onDelete8aNuAscents();
    setIsDelete8aNuModalOpen(false);
  }

  return (
    <Stack
      style={{
        ...statsGridStyle,
        gridTemplateColumns:
          isMobileChartLayout || isTabletReportLayout
            ? "minmax(0, 1fr)"
            : statsGridStyle.gridTemplateColumns,
      }}
    >
      <MetricCard
        label="Wpisy raportowe"
        value={String(ascentsCount)}
        detail="Wszystkie zapisane przejścia"
      />
      <MetricCard
        label="Panel"
        value={String(panelAscents)}
        detail="Liczba przejść panelowych"
      />
      <MetricCard
        label="Skała"
        value={String(rockAscents)}
        detail="Liczba przejść skalnych"
        actionLayout="aside"
        action={
          <div style={{ display: "grid", justifyItems: "end", gap: 6 }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 32,
                padding: "6px 9px",
                border: "1px solid rgba(24, 33, 43, 0.16)",
                background: "rgba(255,255,255,0.88)",
                color: "var(--text)",
                cursor: "pointer",
                fontSize: "0.82rem",
                fontWeight: 700,
              }}
            >
              Import CSV z 8a.nu
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={onCsvImport}
                style={{ display: "none" }}
              />
            </label>
            <button
              type="button"
              disabled={imported8aNuAscentsCount === 0}
              onClick={() => setIsDelete8aNuModalOpen(true)}
              style={{
                ...deleteButtonStyle,
                padding: "6px 9px",
                fontSize: "0.82rem",
                opacity: imported8aNuAscentsCount === 0 ? 0.45 : 1,
                cursor:
                  imported8aNuAscentsCount === 0 ? "not-allowed" : "pointer",
              }}
            >
              Usuń dane z 8a.nu ({imported8aNuAscentsCount})
            </button>
            {importMessage ? (
              <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                {importMessage}
              </span>
            ) : null}
          </div>
        }
      />
      {importPreview && typeof document !== "undefined"
        ? createPortal(
            <div
              style={weightEntryModalOverlayStyle}
              role="presentation"
              onMouseDown={onCloseImportPreview}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="8a-import-preview-title"
                style={{ ...weightEntryModalStyle, width: "min(100%, 520px)" }}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div style={panelHeadingStyle}>
                  <div>
                    <span style={moduleEyebrowStyle}>Podgląd importu</span>
                    <h3 id="8a-import-preview-title" style={sectionTitleStyle}>
                      Dane z 8a.nu
                    </h3>
                  </div>
                  <span>
                    {importPreview.ascents.length +
                      (includeOtherStyles
                        ? importPreview.optionalAscents.length
                        : 0)}{" "}
                    przejść
                  </span>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {[
                    { label: "PLIK", value: importPreview.fileName },
                    { label: "ŹRÓDŁO", value: importPreview.source },
                    { label: "TYP", value: "Skała" },
                    {
                      label: "ZAKRES DAT",
                      value: `${importPreview.firstDate} - ${importPreview.lastDate}`,
                    },
                    {
                      label: "POMINIĘTE WIERSZE",
                      value: String(visibleSkippedRows.length),
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "0.7rem 0.8rem",
                        border: "1px solid var(--border-strong)",
                        background: "rgba(255,255,255,0.45)",
                      }}
                    >
                      <span
                        style={{ color: "var(--muted)", fontSize: "0.82rem" }}
                      >
                        {item.label}
                      </span>
                      <strong
                        style={{ overflowWrap: "anywhere", textAlign: "right" }}
                      >
                        {item.value}
                      </strong>
                    </div>
                  ))}
                </div>
                {importPreview.optionalAscents.length > 0 ? (
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--text)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={includeOtherStyles}
                      onChange={(event) =>
                        setIncludeOtherStyles(event.target.checked)
                      }
                      style={{ accentColor: "var(--accent)" }}
                    />
                    Importuj też pozostałe style (
                    {importPreview.optionalAscents.length})
                  </label>
                ) : null}
                {visibleSkippedRows.length > 0 ? (
                  <div style={{ display: "grid", gap: 6 }}>
                    <span
                      style={{ color: "var(--muted)", fontSize: "0.82rem" }}
                    >
                      Pominięte rekordy
                    </span>
                    <div
                      style={{
                        display: "grid",
                        gap: 6,
                        maxHeight: 220,
                        overflowY: "auto",
                      }}
                    >
                      {visibleSkippedRows.map((row) => (
                        <div
                          key={`${row.lineNumber}-${row.routeName}`}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            padding: "0.55rem 0.7rem",
                            border: "1px solid var(--border-strong)",
                            background: "rgba(255,255,255,0.45)",
                          }}
                        >
                          <span style={{ overflowWrap: "anywhere" }}>
                            Wiersz {row.lineNumber}: {row.routeName}
                          </span>
                          <strong
                            style={{ textAlign: "right", whiteSpace: "nowrap" }}
                          >
                            {row.style} · {row.reason}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <p style={mutedParagraphStyle}>
                  Import zapisze przejścia jako Skała z pochodzeniem 8a.nu.
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: "1rem" }}>
                  <button
                    type="button"
                    onClick={onCloseImportPreview}
                    style={ghostButtonStyle}
                    disabled={isImporting}
                  >
                    Anuluj
                  </button>
                  <button
                    type="button"
                    onClick={() => void onConfirmImport(includeOtherStyles)}
                    style={secondaryButtonStyle}
                    disabled={isImporting}
                  >
                    {isImporting ? "Importowanie..." : "Importuj przejścia"}
                  </button>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
      {isDelete8aNuModalOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              style={weightEntryModalOverlayStyle}
              role="presentation"
              onMouseDown={() => setIsDelete8aNuModalOpen(false)}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="8a-delete-modal-title"
                style={weightEntryModalStyle}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div style={panelHeadingStyle}>
                  <div>
                    <span style={moduleEyebrowStyle}>Nieodwracalna akcja</span>
                    <h3 id="8a-delete-modal-title" style={sectionTitleStyle}>
                      Usunąć dane z 8a.nu?
                    </h3>
                  </div>
                </div>
                <p style={mutedParagraphStyle}>
                  Zostanie trwale usuniętych {imported8aNuAscentsCount} przejść
                  oznaczonych jako import z 8a.nu. Ręcznie dodane wpisy
                  pozostaną bez zmian.
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: "1rem" }}>
                  <button
                    type="button"
                    onClick={() => setIsDelete8aNuModalOpen(false)}
                    style={ghostButtonStyle}
                  >
                    Anuluj
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete8aNuAscents()}
                    style={deleteButtonStyle}
                  >
                    Usuń dane z 8a.nu
                  </button>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </Stack>
  );
}
