import {
  eyebrowStyle,
  moduleIntroStyle,
  mutedParagraphStyle,
  pageTitleStyle,
} from "@/components/climberbook/common/styles";
import type { SettingsHeaderWidgetProps } from "./SettingsWidgetTypes";
export function SettingsHeaderWidget({ meta }: SettingsHeaderWidgetProps) {
  return (
    <div style={moduleIntroStyle}>
      <div>
        <p style={eyebrowStyle}>{meta.eyebrow}</p>
        <h1 style={pageTitleStyle}>{meta.title}</h1>
        <p style={mutedParagraphStyle}>{meta.description}</p>
      </div>
    </div>
  );
}
