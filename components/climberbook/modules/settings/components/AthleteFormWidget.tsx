import {
  fieldStyle,
  moduleEyebrowStyle,
  panelHeadingStyle,
  sectionTitleStyle,
} from "@/components/climberbook/common/styles";
import { Button } from "@/components/climberbook/common/Button";
import { Input, Select } from "@/components/climberbook/common/FormControls";
import {
  Form,
  FormActions,
  FormGrid,
} from "@/components/climberbook/common/FormLayout";
import type { UserSex } from "@/lib/climbs-db";
import type { AthleteFormWidgetProps } from "./SettingsWidgetTypes";

export function AthleteFormWidget({
  athleteFormMode,
  athleteForm,
  setAthleteForm,
  sections,
  showSectionField = true,
  panelClassName,
  validationMessage,
  onAthleteFormSubmit,
  onResetAthleteForm,
}: AthleteFormWidgetProps) {
  return (
    <Form
      onSubmit={onAthleteFormSubmit}
      panelClassName={panelClassName}
      header={
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>
              {athleteFormMode === "edit" ? "Edycja" : "Nowy"}
            </span>
            <h2 id="athlete-form-title" style={sectionTitleStyle}>
              {athleteFormMode === "edit"
                ? "Edytuj zawodnika"
                : "Dodaj zawodnika"}
            </h2>
          </div>
        </div>
      }
    >
      <FormGrid>
        <label style={fieldStyle}>
          Nick
          <Input
            value={athleteForm.nick}
            onChange={(event) =>
              setAthleteForm((current) => ({
                ...current,
                nick: event.target.value,
              }))
            }
            placeholder="Wyświetlana nazwa"
            required
          />
        </label>
        <label style={fieldStyle}>
          E-mail
          <Input
            value={athleteForm.email}
            onChange={(event) =>
              setAthleteForm((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
            type="email"
            placeholder="Opcjonalny adres e-mail"
          />
        </label>
        <label style={fieldStyle}>
          Imię
          <Input
            value={athleteForm.firstName}
            onChange={(event) =>
              setAthleteForm((current) => ({
                ...current,
                firstName: event.target.value,
              }))
            }
          />
        </label>
        <label style={fieldStyle}>
          Nazwisko
          <Input
            value={athleteForm.lastName}
            onChange={(event) =>
              setAthleteForm((current) => ({
                ...current,
                lastName: event.target.value,
              }))
            }
          />
        </label>
        {showSectionField ? (
          <label style={fieldStyle}>
            Sekcja / Team
            <Select
              value={athleteForm.sectionId}
              onChange={(event) =>
                setAthleteForm((current) => ({
                  ...current,
                  sectionId: event.target.value,
                }))
              }
            >
              <option value="">Bez sekcji</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </Select>
          </label>
        ) : null}
        <label style={fieldStyle}>
          Data urodzenia
          <Input
            value={athleteForm.birthDate}
            onChange={(event) =>
              setAthleteForm((current) => ({
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
            value={athleteForm.sex}
            onChange={(event) =>
              setAthleteForm((current) => ({
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
            value={athleteForm.heightCm}
            onChange={(event) =>
              setAthleteForm((current) => ({
                ...current,
                heightCm: event.target.value,
              }))
            }
            type="number"
            min="1"
            step="1"
          />
        </label>
        <label style={fieldStyle}>
          Waga (kg)
          <Input
            value={athleteForm.weightKg}
            onChange={(event) =>
              setAthleteForm((current) => ({
                ...current,
                weightKg: event.target.value.replaceAll(",", "."),
              }))
            }
            type="number"
            min="0"
            step="0.1"
          />
        </label>
      </FormGrid>
      {validationMessage ? (
        <p
          style={{
            margin: 0,
            color: "#9e2e28",
            fontSize: "0.95rem",
          }}
        >
          {validationMessage}
        </p>
      ) : null}
      <FormActions layout="inline">
        <Button type="submit" variant="tertiary">
          {athleteFormMode === "edit" ? "Zapisz zmiany" : "Dodaj zawodnika"}
        </Button>
        <Button variant="secondary" onClick={onResetAthleteForm}>
          Anuluj
        </Button>
      </FormActions>
    </Form>
  );
}
