import {
  actionRowStyle,
  backupDropzoneStyle,
  ghostButtonStyle,
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  panelStyle,
  secondaryButtonStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
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
    <section style={panelStyle}>
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
      <div style={actionRowStyle}>
        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={onDatabaseExport}
        >
          Eksport całości
        </button>
        <input
          ref={backupImportInputRef}
          type="file"
          accept="application/json,.json"
          onChange={onDatabaseImport}
          style={{ display: "none" }}
        />
        <button
          type="button"
          style={ghostButtonStyle}
          onClick={() => backupImportInputRef.current?.click()}
        >
          Import z pliku
        </button>
      </div>
      <div
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
    </section>
  );
}
