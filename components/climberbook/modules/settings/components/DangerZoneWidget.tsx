import {
  actionRowStyle,
  deleteButtonStyle,
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  panelStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import type { DangerZoneWidgetProps } from "./SettingsWidgetTypes";
export function DangerZoneWidget({
  setIsDatabaseDeleteModalOpen,
}: DangerZoneWidgetProps) {
  return (
    <section style={panelStyle}>
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Zaawansowane</span>
          <h2 style={sectionTitleStyle}>Strefa niebezpieczna</h2>
        </div>
        <span style={softTagStyle}>Nieodwracalne</span>
      </div>
      <p style={mutedParagraphStyle}>
        Usunięcie bazy danych trwale kasuje wszystkich zawodników i ich dane.
        Zalecany wcześniejszy eksport całości.
      </p>
      <div style={actionRowStyle}>
        <button
          type="button"
          style={deleteButtonStyle}
          onClick={() => setIsDatabaseDeleteModalOpen(true)}
        >
          USUŃ BAZĘ DANYCH
        </button>
      </div>
    </section>
  );
}
