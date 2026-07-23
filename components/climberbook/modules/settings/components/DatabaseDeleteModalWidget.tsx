import {
  deleteButtonStyle,
  fieldStyle,
  ghostButtonStyle,
  inputStyle,
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  sectionTitleStyle,
} from "@/components/climberbook/common/styles";
import { Button } from "@/components/climberbook/common/Button";
import { Form, FormActions } from "@/components/climberbook/common/FormLayout";
import { Modal } from "@/components/climberbook/common/Modal";
import type { DatabaseDeleteModalWidgetProps } from "./SettingsWidgetTypes";
export function DatabaseDeleteModalWidget({
  databaseDeleteConfirmation,
  setDatabaseDeleteConfirmation,
  onDatabaseDelete,
  onCloseDatabaseDeleteModal,
}: DatabaseDeleteModalWidgetProps) {
  return (
    <Modal
      labelledBy="database-delete-modal-title"
      onClose={onCloseDatabaseDeleteModal}
    >
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Nieodwracalna akcja</span>
          <h3 id="database-delete-modal-title" style={sectionTitleStyle}>
            Usunąć konto?
          </h3>
        </div>
        <Button variant="secondary" onClick={onCloseDatabaseDeleteModal}>
          Anuluj
        </Button>
      </div>
      <p style={mutedParagraphStyle}>
        Konto oraz wszystkie powiązane treningi, przejścia, ustawienia i pomiary
        wagi zostaną trwale usunięte. Wpisz „usuń konto”, aby potwierdzić.
      </p>
      <Form
        as="div"
        onSubmit={onDatabaseDelete}
        panelPadding="none"
        panelGap="none"
      >
        <label style={fieldStyle}>
          Potwierdzenie
          <input
            value={databaseDeleteConfirmation}
            onChange={(event) =>
              setDatabaseDeleteConfirmation(event.target.value)
            }
            placeholder="usuń konto"
            autoComplete="off"
            style={inputStyle}
          />
        </label>
        <FormActions>
          <Button
            type="submit"
            variant="secondary"
            disabled={databaseDeleteConfirmation !== "usuń konto"}
            style={{
              ...deleteButtonStyle,
              opacity: databaseDeleteConfirmation === "usuń konto" ? 1 : 0.45,
              cursor:
                databaseDeleteConfirmation === "usuń konto"
                  ? "pointer"
                  : "not-allowed",
            }}
          >
            USUŃ KONTO
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
}
