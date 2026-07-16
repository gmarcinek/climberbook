import {
  deleteButtonStyle,
  fieldStyle,
  formStyle,
  ghostButtonStyle,
  inputStyle,
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  weightEntryModalOverlayStyle,
  weightEntryModalStyle,
} from "@/components/climberbook/common/styles";
import { FormActions } from "@/components/climberbook/common/FormLayout";
import type { DatabaseDeleteModalWidgetProps } from "./SettingsWidgetTypes";
export function DatabaseDeleteModalWidget({
  databaseDeleteConfirmation,
  setDatabaseDeleteConfirmation,
  onDatabaseDelete,
  onCloseDatabaseDeleteModal,
}: DatabaseDeleteModalWidgetProps) {
  return (
    <div
      style={weightEntryModalOverlayStyle}
      role="presentation"
      onMouseDown={onCloseDatabaseDeleteModal}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="database-delete-modal-title"
        style={weightEntryModalStyle}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Nieodwracalna akcja</span>
            <h3 id="database-delete-modal-title" style={sectionTitleStyle}>
              Usunąć bazę danych?
            </h3>
          </div>
          <button
            type="button"
            onClick={onCloseDatabaseDeleteModal}
            style={ghostButtonStyle}
          >
            Anuluj
          </button>
        </div>
        <p style={mutedParagraphStyle}>
          Wszystkie lokalne treningi, przejścia, ustawienia i pomiary wagi
          zostaną trwale usunięte. Wpisz „usuń”, aby potwierdzić.
        </p>
        <form onSubmit={onDatabaseDelete} style={formStyle}>
          <label style={fieldStyle}>
            Potwierdzenie
            <input
              value={databaseDeleteConfirmation}
              onChange={(event) =>
                setDatabaseDeleteConfirmation(event.target.value)
              }
              placeholder="usuń"
              autoComplete="off"
              style={inputStyle}
            />
          </label>
          <FormActions>
            <button
              type="submit"
              disabled={databaseDeleteConfirmation !== "usuń"}
              style={{
                ...deleteButtonStyle,
                opacity: databaseDeleteConfirmation === "usuń" ? 1 : 0.45,
                cursor:
                  databaseDeleteConfirmation === "usuń"
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              USUŃ BAZĘ DANYCH
            </button>
          </FormActions>
        </form>
      </section>
    </div>
  );
}
