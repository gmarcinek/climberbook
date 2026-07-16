import {
  fieldStyle,
  formActionsStyle,
  ghostButtonStyle,
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  secondaryButtonStyle,
  softTagStyle,
  weightEntryModalOverlayStyle,
  weightEntryModalStyle,
} from "@/components/climberbook/common/styles";
import type { ImportPreviewModalWidgetProps } from "./SettingsWidgetTypes";

const countLabelMap = {
  athletes: "Zawodnicy",
  sections: "Sekcje",
  climbs: "Wspiny",
  trainings: "Treningi",
  ascents: "Przejścia",
  profiles: "Profile",
  weightEntries: "Pomiary wagi",
} as const;

export function ImportPreviewModalWidget({
  preview,
  isImporting,
  onConfirmImport,
  onCloseImportPreview,
}: ImportPreviewModalWidgetProps) {
  return (
    <div
      style={weightEntryModalOverlayStyle}
      role="presentation"
      onMouseDown={onCloseImportPreview}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-preview-modal-title"
        style={{ ...weightEntryModalStyle, width: "min(100%, 520px)" }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Podgląd importu</span>
            <h3 id="import-preview-modal-title" style={sectionTitleStyle}>
              {preview.title}
            </h3>
          </div>
          <span style={softTagStyle}>v{preview.formatVersion}</span>
        </div>
        <p style={mutedParagraphStyle}>{preview.summary}</p>
        {preview.athleteName ? (
          <div style={fieldStyle}>
            <span>Nazwa</span>
            <strong>{preview.athleteName}</strong>
          </div>
        ) : null}
        <div style={{ display: "grid", gap: 8 }}>
          {Object.entries(preview.counts).map(([key, value]) => (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "0.7rem 0.8rem",
                border: "1px solid var(--border-strong)",
                background: "rgba(255,255,255,0.45)",
              }}
            >
              <span>{countLabelMap[key as keyof typeof countLabelMap]}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <p style={mutedParagraphStyle}>{preview.actionLabel}</p>
        <div style={formActionsStyle}>
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
            onClick={() => void onConfirmImport()}
            style={secondaryButtonStyle}
            disabled={isImporting}
          >
            {isImporting ? "Importowanie..." : "Importuj"}
          </button>
        </div>
      </section>
    </div>
  );
}
