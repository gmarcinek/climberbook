import {
  buttonStyle,
  fieldStyle,
  formActionsStyle,
  formGridStyle,
  formStyle,
  ghostButtonStyle,
  inputStyle,
  moduleEyebrowStyle,
  panelHeadingStyle,
  panelStyle,
  sectionTitleStyle,
} from "@/components/climberbook/common/styles";
import type { UserSex } from "@/lib/climbs-db";
import type { AthleteFormWidgetProps } from "./SettingsWidgetTypes";

const athleteFormGridStyle = {
  ...formGridStyle,
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gridAutoRows: "auto",
};

export function AthleteFormWidget({
  athleteFormMode,
  athleteForm,
  setAthleteForm,
  sections,
  onAthleteFormSubmit,
  onResetAthleteForm,
}: AthleteFormWidgetProps) {
  return (
    <section style={panelStyle}>
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>
            {athleteFormMode === "edit" ? "Edycja" : "Nowy"}
          </span>
          <h2 style={sectionTitleStyle}>
            {athleteFormMode === "edit"
              ? "Edytuj zawodnika"
              : "Dodaj zawodnika"}
          </h2>
        </div>
      </div>
      <form onSubmit={onAthleteFormSubmit} style={formStyle}>
        <div style={athleteFormGridStyle}>
          <label style={fieldStyle}>
            Imię
            <input
              value={athleteForm.firstName}
              onChange={(event) =>
                setAthleteForm((current) => ({
                  ...current,
                  firstName: event.target.value,
                }))
              }
              style={inputStyle}
            />
          </label>
          <label style={fieldStyle}>
            Nazwisko
            <input
              value={athleteForm.lastName}
              onChange={(event) =>
                setAthleteForm((current) => ({
                  ...current,
                  lastName: event.target.value,
                }))
              }
              style={inputStyle}
            />
          </label>
          <label style={fieldStyle}>
            Nick
            <input
              value={athleteForm.nick}
              onChange={(event) =>
                setAthleteForm((current) => ({
                  ...current,
                  nick: event.target.value,
                }))
              }
              placeholder="Wyświetlana nazwa"
              style={inputStyle}
            />
          </label>
          <label style={fieldStyle}>
            Sekcja / Team
            <select
              value={athleteForm.sectionId}
              onChange={(event) =>
                setAthleteForm((current) => ({
                  ...current,
                  sectionId: event.target.value,
                }))
              }
              style={inputStyle}
            >
              <option value="">Bez sekcji</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>
          <label style={fieldStyle}>
            Data urodzenia
            <input
              value={athleteForm.birthDate}
              onChange={(event) =>
                setAthleteForm((current) => ({
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
              value={athleteForm.sex}
              onChange={(event) =>
                setAthleteForm((current) => ({
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
              style={inputStyle}
            />
          </label>
          <label style={fieldStyle}>
            Waga (kg)
            <input
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
              style={inputStyle}
            />
          </label>
        </div>
        <div style={formActionsStyle}>
          <button type="submit" style={buttonStyle}>
            {athleteFormMode === "edit" ? "Zapisz zmiany" : "Dodaj zawodnika"}
          </button>
          {athleteFormMode === "edit" && (
            <button
              type="button"
              style={ghostButtonStyle}
              onClick={onResetAthleteForm}
            >
              Anuluj
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
