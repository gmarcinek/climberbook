"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { MetricCard } from "@/components/climberbook/common/charts";
import { Button } from "@/components/climberbook/common/Button";
import { Modal } from "@/components/climberbook/common/Modal";
import { Stack } from "@/components/climberbook/common/Stack";
import { useViewport } from "@/components/climberbook/hooks/useViewport";
import type { AscentCsvImportPreview } from "@/components/climberbook/providers/ClimberbookProvider";
import {
  deleteButtonStyle,
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  statsGridStyle,
} from "@/components/climberbook/common/styles";
type ReportMetricsWidgetProps = {
  ascentsCount: number;
  panelAscents: number;
  rockAscents: number;
  onCsvImport: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  importPreview: AscentCsvImportPreview | null;
  isImporting: boolean;
  imported8aNuAscentsCount: number;
  onConfirmImport: (
    includeOtherStyles: boolean,
    overwriteDuplicates: boolean,
  ) => Promise<void>;
  onCloseImportPreview: () => void;
  onDelete8aNuAscents: () => Promise<void>;
};
export function ReportMetricsWidget({
  ascentsCount,
  panelAscents,
  rockAscents,
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
  const [overwriteDuplicates, setOverwriteDuplicates] = useState(false);
  const visibleSkippedRows = importPreview
    ? importPreview.skippedAscentRows.filter(
        (row) => !includeOtherStyles || !row.canImportWhenSelected,
      )
    : [];

  useEffect(() => {
    setIncludeOtherStyles(false);
    setOverwriteDuplicates(false);
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
            <Button
              size="small"
              variant="secondary"
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
            </Button>
          </div>
        }
      />
      {importPreview ? (
        <Modal
          labelledBy="8a-import-preview-title"
          onClose={onCloseImportPreview}
          style={{ width: "min(100%, 520px)" }}
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
              {
                label: "ISTNIEJĄCE WPISY",
                value: String(importPreview.duplicateCount),
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
                <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
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
          {importPreview.duplicateCount > 0 ? (
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
                checked={overwriteDuplicates}
                onChange={(event) =>
                  setOverwriteDuplicates(event.target.checked)
                }
                style={{ accentColor: "var(--accent)" }}
              />
              Nadpisz istniejące wpisy ({importPreview.duplicateCount})
            </label>
          ) : null}
          {visibleSkippedRows.length > 0 ? (
            <div style={{ display: "grid", gap: 6 }}>
              <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
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
            <Button
              variant="secondary"
              onClick={onCloseImportPreview}
              disabled={isImporting}
            >
              Anuluj
            </Button>
            <Button
              variant="quadrary"
              onClick={() =>
                void onConfirmImport(includeOtherStyles, overwriteDuplicates)
              }
              disabled={isImporting}
            >
              {isImporting ? "Importowanie..." : "Importuj przejścia"}
            </Button>
          </div>
        </Modal>
      ) : null}
      {isDelete8aNuModalOpen ? (
        <Modal
          labelledBy="8a-delete-modal-title"
          onClose={() => setIsDelete8aNuModalOpen(false)}
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
            oznaczonych jako import z 8a.nu. Ręcznie dodane wpisy pozostaną bez
            zmian.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: "1rem" }}>
            <Button
              variant="secondary"
              onClick={() => setIsDelete8aNuModalOpen(false)}
            >
              Anuluj
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleDelete8aNuAscents()}
              style={deleteButtonStyle}
            >
              Usuń dane z 8a.nu
            </Button>
          </div>
        </Modal>
      ) : null}
    </Stack>
  );
}
