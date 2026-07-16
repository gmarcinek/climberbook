import {
  buttonStyle,
  fieldStyle,
  formActionsStyle,
  formGridStyle,
  formStyle,
  inputStyle,
  moduleEyebrowStyle,
  panelHeadingStyle,
  panelStyle,
  sectionTitleStyle,
  softTagStyle,
  weightControlStyle,
  weightStepButtonStyle,
} from "@/components/climberbook/common/styles";
import {
  formatWeightInput,
  parseHeightInput,
  parseWeightInput,
} from "@/components/climberbook/common/training";
import type { UserSex } from "@/lib/climbs-db";
import type { ProfileFormWidgetProps } from "./SettingsWidgetTypes";
export function ProfileFormWidget({
  profileDraft,
  setProfileDraft,
  onSettingsSubmit,
}: ProfileFormWidgetProps) {
  return (
    <section style={panelStyle}>
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Profil</span>
          <h2 style={sectionTitleStyle}>Settings użytkownika</h2>
        </div>
        <span style={softTagStyle}>Data urodzenia, płeć, wzrost, waga</span>
      </div>
      <form onSubmit={onSettingsSubmit} style={formStyle}>
        <div style={formGridStyle}>
          <label style={fieldStyle}>
            Data urodzenia
            <input
              value={profileDraft.birthDate}
              onChange={(event) =>
                setProfileDraft((current) => ({
                  ...current,
                  birthDate: event.target.value,
                }))
              }
              type="date"
              style={inputStyle}
            />
          </label>
          <label style={fieldStyle}>
            Płeć
            <select
              value={profileDraft.sex}
              onChange={(event) =>
                setProfileDraft((current) => ({
                  ...current,
                  sex: event.target.value as UserSex,
                }))
              }
              style={inputStyle}
            >
              <option value="">Nie podano</option>
              <option value="kobieta">Kobieta</option>
              <option value="mezczyzna">Mężczyzna</option>
              <option value="inna">Inna</option>
            </select>
          </label>
          <label style={fieldStyle}>
            Wzrost (cm)
            <input
              value={profileDraft.heightCm}
              onChange={(event) =>
                setProfileDraft((current) => ({
                  ...current,
                  heightCm: event.target.value,
                }))
              }
              onBlur={() =>
                setProfileDraft((current) => ({
                  ...current,
                  heightCm:
                    parseHeightInput(current.heightCm)?.toString() ?? "",
                }))
              }
              type="number"
              min="1"
              step="1"
              style={inputStyle}
            />
          </label>
          <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            Waga (kg)
            <div style={weightControlStyle}>
              <button
                type="button"
                style={weightStepButtonStyle}
                onClick={() =>
                  setProfileDraft((current) => ({
                    ...current,
                    weightKg: formatWeightInput(
                      Math.max(
                        0,
                        (parseWeightInput(current.weightKg) ?? 0) - 0.1,
                      ),
                    ),
                  }))
                }
              >
                -
              </button>
              <input
                value={profileDraft.weightKg}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    weightKg: event.target.value.replaceAll(",", "."),
                  }))
                }
                onBlur={() =>
                  setProfileDraft((current) => ({
                    ...current,
                    weightKg: formatWeightInput(
                      parseWeightInput(current.weightKg),
                    ),
                  }))
                }
                type="number"
                min="0"
                step="0.1"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="button"
                style={weightStepButtonStyle}
                onClick={() =>
                  setProfileDraft((current) => ({
                    ...current,
                    weightKg: formatWeightInput(
                      (parseWeightInput(current.weightKg) ?? 0) + 0.1,
                    ),
                  }))
                }
              >
                +
              </button>
            </div>
          </label>
        </div>
        <div style={formActionsStyle}>
          <button type="submit" style={buttonStyle}>
            Zapisz settings
          </button>
        </div>
      </form>
    </section>
  );
}
