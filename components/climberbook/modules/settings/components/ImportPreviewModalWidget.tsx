import {
  fieldStyle,
  ghostButtonStyle,
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  secondaryButtonStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import { FormActions } from "@/components/climberbook/common/FormLayout";
import { Modal } from "@/components/climberbook/common/Modal";
import { Stack } from "@/components/climberbook/common/Stack";
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
    <Modal
      labelledBy="import-preview-modal-title"
      onClose={onCloseImportPreview}
      style={{ width: "min(100%, 520px)" }}
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
      <Stack gap="sm">
        {Object.entries(preview.counts).map(([key, value]) => (
          <Stack
            key={key}
            direction="row"
            gap="sm"
            justify="between"
            align="center"
            style={{
              padding: "0.7rem 0.8rem",
              border: "1px solid var(--border-strong)",
              background: "rgba(255,255,255,0.45)",
            }}
          >
            <span>{countLabelMap[key as keyof typeof countLabelMap]}</span>
            <strong>{value}</strong>
          </Stack>
        ))}
      </Stack>
      <p style={mutedParagraphStyle}>{preview.actionLabel}</p>
      <FormActions>
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
      </FormActions>
    </Modal>
  );
}
