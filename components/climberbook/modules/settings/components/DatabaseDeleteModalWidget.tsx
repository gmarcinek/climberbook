import {
  deleteButtonStyle,
  fieldStyle,
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  sectionTitleStyle,
} from "@/components/climberbook/common/styles";
import { AlertTriangle, Lightbulb } from "lucide-react";
import { Button } from "@/components/climberbook/common/Button";
import { Input } from "@/components/climberbook/common/FormControls";
import { Form, FormActions } from "@/components/climberbook/common/FormLayout";
import { Modal } from "@/components/climberbook/common/Modal";
import type { DatabaseDeleteModalWidgetProps } from "./SettingsWidgetTypes";
import styles from "./DatabaseDeleteModalWidget.module.css";
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
      className={styles.dialog}
    >
      <div className={styles.body}>
        <div style={panelHeadingStyle} className={styles.heading}>
          <div>
            <span style={moduleEyebrowStyle}>Nieodwracalna akcja</span>
            <h3 id="database-delete-modal-title" style={sectionTitleStyle}>
              Usunąć konto?
            </h3>
          </div>
        </div>
        <div className={styles.warning}>
          <AlertTriangle aria-hidden="true" size={32} strokeWidth={2} />
          <div>
            <p>
              Konto oraz wszystkie treningi, przejścia, ustawienia i pomiary
              wagi zostaną trwale usunięte.
            </p>
          </div>
        </div>
        <p className={styles.exportPrompt}>
          <Lightbulb aria-hidden="true" size={28} strokeWidth={2} />
          <span>
            Przed usunięciem wyeksportuj dane przyciskiem „Eksport całości”.
            Najlepiej wykonaj eksport na komputerze.
          </span>
        </p>
        <Form
          as="div"
          onSubmit={onDatabaseDelete}
          panelPadding="none"
          panelGap="none"
          panelStyle={{ background: "transparent" }}
        >
          <label style={fieldStyle}>
            <span className={styles.confirmationInstruction}>
              Wpisz <code className={styles.confirmationValue}>delete</code>,
              aby potwierdzić
            </span>
            <Input
              autoFocus
              value={databaseDeleteConfirmation}
              onChange={(event) =>
                setDatabaseDeleteConfirmation(event.target.value)
              }
              placeholder="delete"
              autoComplete="off"
            />
          </label>
          <FormActions
            layout="inline"
            marginTop="md"
            className={styles.actions}
          >
            <Button variant="secondary" onClick={onCloseDatabaseDeleteModal}>
              Anuluj
            </Button>
            <Button
              type="submit"
              variant="secondary"
              disabled={databaseDeleteConfirmation !== "delete"}
              style={{
                ...deleteButtonStyle,
                opacity: databaseDeleteConfirmation === "delete" ? 1 : 0.45,
                cursor:
                  databaseDeleteConfirmation === "delete"
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              Usuń konto
            </Button>
          </FormActions>
        </Form>
      </div>
    </Modal>
  );
}
