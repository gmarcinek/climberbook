import {
  backupDropzoneStyle,
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import { Button } from "@/components/climberbook/common/Button";
import { Panel } from "@/components/climberbook/common/Panel";
import { Stack } from "@/components/climberbook/common/Stack";
import styles from "./DatabaseBackupWidget.module.css";
import type { DatabaseBackupWidgetProps } from "./SettingsWidgetTypes";
export function DatabaseBackupWidget({
  backupImportInputRef,
  onDatabaseExport,
  onDatabaseImport,
  isBackupDropActive,
  setIsBackupDropActive,
  onBackupDrop,
}: DatabaseBackupWidgetProps) {
  return (
    <Panel gap="md">
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Dane</span>
          <h2 style={sectionTitleStyle}>Pełna kopia bazy</h2>
        </div>
        <span style={softTagStyle}>Całość danych</span>
      </div>
      <p style={mutedParagraphStyle}>
        Eksport zapisuje wszystkich zawodników i ich dane. Import rozpoznaje
        backup całej bazy albo pojedynczego zawodnika.
      </p>
      <Stack direction="row" gap="sm" wrap>
        <Button variant="quadrary" onClick={onDatabaseExport}>
          Eksport całości
        </Button>
        <input
          ref={backupImportInputRef}
          type="file"
          accept="application/json,.json"
          onChange={onDatabaseImport}
          style={{ display: "none" }}
        />
        <Button
          variant="tertiary"
          onClick={() => backupImportInputRef.current?.click()}
        >
          Import z pliku
        </Button>
      </Stack>
      <div
        className={styles.dropzone}
        style={{
          ...backupDropzoneStyle,
          borderColor: isBackupDropActive
            ? "var(--accent)"
            : "var(--border-strong)",
          background: isBackupDropActive
            ? "rgba(195, 102, 58, 0.1)"
            : "rgba(255,255,255,0.38)",
        }}
        role="button"
        tabIndex={0}
        onClick={() => backupImportInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            backupImportInputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsBackupDropActive(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsBackupDropActive(false)}
        onDrop={onBackupDrop}
      >
        {isBackupDropActive
          ? "Upuść backup JSON"
          : "Przeciągnij backup JSON tutaj"}
      </div>
    </Panel>
  );
}
