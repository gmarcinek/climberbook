import {
  deleteButtonStyle,
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import { Button } from "@/components/climberbook/common/Button";
import { Panel } from "@/components/climberbook/common/Panel";
import { Stack } from "@/components/climberbook/common/Stack";
import type { DangerZoneWidgetProps } from "./SettingsWidgetTypes";
export function DangerZoneWidget({
  setIsDatabaseDeleteModalOpen,
}: DangerZoneWidgetProps) {
  return (
    <Panel gap="md">
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Zaawansowane</span>
          <h2 style={sectionTitleStyle}>Strefa niebezpieczna</h2>
        </div>
        <span style={softTagStyle}>Nieodwracalne</span>
      </div>
      <p style={mutedParagraphStyle}>
        Usunięcie konta trwale kasuje Twoich zawodników i wszystkie powiązane
        dane. Zalecany wcześniejszy eksport całości.
      </p>
      <Stack direction="row" gap="sm" wrap>
        <Button
          variant="secondary"
          style={deleteButtonStyle}
          onClick={() => setIsDatabaseDeleteModalOpen(true)}
        >
          USUŃ KONTO
        </Button>
      </Stack>
    </Panel>
  );
}
