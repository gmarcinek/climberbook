import {
  fieldStyle,
  moduleEyebrowStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import { Button } from "@/components/climberbook/common/Button";
import {
  Input,
  NumericStepperControl,
  Select,
} from "@/components/climberbook/common/FormControls";
import {
  Form,
  FormActions,
  FormGrid,
  formLayoutClassNames,
} from "@/components/climberbook/common/FormLayout";
import {
  formatWeightInput,
  getLatestWeightEntry,
  parseHeightInput,
  parseWeightInput,
} from "@/components/climberbook/common/training";
import type { UserSex } from "@/lib/climbs-db";
import type { ProfileFormWidgetProps } from "./SettingsWidgetTypes";
export function ProfileFormWidget({
  activeAthlete,
  accountEmail,
  profileDraft,
  weightEntries,
  setProfileDraft,
  onSettingsSubmit,
  onStartAthleteEdit,
}: ProfileFormWidgetProps) {
  const latestWeightEntry = getLatestWeightEntry(weightEntries);

  return (
    <Form
      onSubmit={onSettingsSubmit}
      header={
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Profil</span>
            <h2 style={sectionTitleStyle}>Settings użytkownika</h2>
          </div>
          <span style={softTagStyle}>Dane konta i parametry treningowe</span>
        </div>
      }
    >
      <div style={fieldStyle}>
        <span>Dane zawodnika</span>
        <strong>
          {activeAthlete?.name || "Nie wybrano zawodnika"}
        </strong>
        {activeAthlete ? (
          <span>
            {[
              activeAthlete.firstName,
              activeAthlete.lastName,
              activeAthlete.nick && `nick: ${activeAthlete.nick}`,
            ]
              .filter(Boolean)
              .join(" · ") || "Brak dodatkowych danych"}
          </span>
        ) : null}
        {accountEmail ? (
          <span>
            E-mail logowania Google: {accountEmail}. Aby go zmienić, zaloguj
            się innym kontem Google.
          </span>
        ) : null}
        {activeAthlete ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => void onStartAthleteEdit(activeAthlete)}
          >
            Edytuj dane zawodnika
          </Button>
        ) : null}
      </div>
      <FormGrid>
        <label style={fieldStyle}>
          Data urodzenia
          <Input
            value={profileDraft.birthDate}
            onChange={(event) =>
              setProfileDraft((current) => ({
                ...current,
                birthDate: event.target.value,
              }))
            }
            type="date"
          />
        </label>
        <label style={fieldStyle}>
          Płeć
          <Select
            value={profileDraft.sex}
            onChange={(event) =>
              setProfileDraft((current) => ({
                ...current,
                sex: event.target.value as UserSex,
              }))
            }
          >
            <option value="">Nie podano</option>
            <option value="kobieta">Kobieta</option>
            <option value="mezczyzna">Mężczyzna</option>
            <option value="inna">Inna</option>
          </Select>
        </label>
        <label style={fieldStyle}>
          Wzrost (cm)
          <Input
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
                heightCm: parseHeightInput(current.heightCm)?.toString() ?? "",
              }))
            }
            type="number"
            min="1"
            step="1"
          />
        </label>
        <label style={fieldStyle} className={formLayoutClassNames.fullSpan}>
          Waga (kg)
          {latestWeightEntry ? (
            <Input
              value={formatWeightInput(latestWeightEntry.weightKg)}
              type="number"
              readOnly
              aria-label="Aktualna waga z historii pomiarów"
            />
          ) : (
            <NumericStepperControl
              value={profileDraft.weightKg}
              onChange={(event) =>
                setProfileDraft((current) => ({
                  ...current,
                  weightKg: event.target.value.replaceAll(",", "."),
                }))
              }
              onDecrement={() =>
                setProfileDraft((current) => ({
                  ...current,
                  weightKg: formatWeightInput(
                    Math.max(0, (parseWeightInput(current.weightKg) ?? 0) - 0.1),
                  ),
                }))
              }
              onIncrement={() =>
                setProfileDraft((current) => ({
                  ...current,
                  weightKg: formatWeightInput(
                    (parseWeightInput(current.weightKg) ?? 0) + 0.1,
                  ),
                }))
              }
              inputProps={{
                onBlur: () =>
                  setProfileDraft((current) => ({
                    ...current,
                    weightKg: formatWeightInput(
                      parseWeightInput(current.weightKg),
                    ),
                  })),
                type: "number",
                min: "0",
                step: "0.1",
              }}
            />
          )}
        </label>
      </FormGrid>
      <FormActions>
        <Button type="submit" variant="tertiary">
          Zapisz settings
        </Button>
      </FormActions>
    </Form>
  );
}
