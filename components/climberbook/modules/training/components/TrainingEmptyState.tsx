"use client";

import {
  moduleContainerStyle,
  moduleContentStyle,
  moduleEyebrowStyle,
  mutedParagraphStyle,
  pageStyle,
  sectionTitleStyle,
  settingsMainColumnStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import { Button } from "@/components/climberbook/common/Button";
import { Panel } from "@/components/climberbook/common/Panel";
import { Stack } from "@/components/climberbook/common/Stack";
import { MainHeader } from "@/components/climberbook/layout/MainHeader";
import { AthleteFormWidget } from "@/components/climberbook/modules/settings/components/AthleteFormWidget";
import { ImportPreviewModalWidget } from "@/components/climberbook/modules/settings/components/ImportPreviewModalWidget";
import styles from "./TrainingEmptyState.module.css";
import { useRouter } from "next/navigation";
import type { AthleteFormDraft } from "@/components/climberbook/providers/ClimberbookProvider";
import type { DatabaseImportPreview, SectionRecord } from "@/lib/climbs-db";
import type {
  ChangeEvent,
  Dispatch,
  FormEvent,
  RefObject,
  SetStateAction,
} from "react";

type TrainingEmptyStateProps = {
  athleteFormMode: "add" | "edit";
  athleteForm: AthleteFormDraft;
  setAthleteForm: Dispatch<SetStateAction<AthleteFormDraft>>;
  sections: SectionRecord[];
  validationMessage?: string;
  onAthleteFormSubmit: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  onResetAthleteForm: () => void;
  backupImportInputRef: RefObject<HTMLInputElement | null>;
  onDatabaseImport: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onLoadSampleData: () => Promise<void>;
  importPreview: DatabaseImportPreview | null;
  isImportPreviewOpen: boolean;
  isImportingBackup: boolean;
  onConfirmImportPreview: () => Promise<void>;
  onCloseImportPreview: () => void;
};

export function TrainingEmptyState({
  athleteFormMode,
  athleteForm,
  setAthleteForm,
  sections,
  validationMessage,
  onAthleteFormSubmit,
  onResetAthleteForm,
  backupImportInputRef,
  onDatabaseImport,
  onLoadSampleData,
  importPreview,
  isImportPreviewOpen,
  isImportingBackup,
  onConfirmImportPreview,
  onCloseImportPreview,
}: TrainingEmptyStateProps) {
  const router = useRouter();

  async function handleAthleteFormSubmit(event: FormEvent<HTMLFormElement>) {
    const wasSaved = await onAthleteFormSubmit(event);
    if (wasSaved) {
      router.push("/trening");
    }
    return wasSaved;
  }

  return (
    <>
      <main style={pageStyle}>
        <MainHeader activeModule="treningowy" />
        <div style={{ padding: "24px 8px 24px" }}>
          <Stack
            gap="md"
            style={{ ...moduleContainerStyle, ...moduleContentStyle }}
            className={styles.contentStack}
          >
            <Panel
              as="section"
              gap="md"
              style={{
                display: "flex",
                padding: undefined,
              }}
              className={`${styles.introPanelShell} ${styles.introPanels}`}
            >
              <Stack className={styles.introPrimary} gap="md">
                <Stack className={styles.sectionHeader} gap="sm">
                  <span style={moduleEyebrowStyle}>Start</span>
                  <h1
                    style={{
                      ...sectionTitleStyle,
                      fontSize: "1.35rem",
                      margin: 0,
                    }}
                  >
                    Baza jest pusta
                  </h1>
                  <span style={softTagStyle}>
                    Dodaj zawodnika albo zaimportuj backup
                  </span>
                </Stack>
                <p style={mutedParagraphStyle}>
                  Żeby zacząć pracę w Climberbook, utwórz pierwszego zawodnika
                  albo wczytaj istniejącą bazę z pliku JSON.
                </p>
                <Stack direction="row" gap="sm" wrap>
                  <input
                    ref={backupImportInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={onDatabaseImport}
                    style={{ display: "none" }}
                  />
                  <Button
                    variant="tertiary"
                    onClick={() => backupImportInputRef.current?.click()}
                  >
                    Import bazy
                  </Button>
                </Stack>
              </Stack>

              <Stack
                className={`${styles.introSecondary} ${styles.generatorPanel}`}
                gap="md"
                style={{
                  border: "1px solid rgba(41, 109, 63, 0.16)",
                  background:
                    "linear-gradient(135deg, rgba(236, 248, 239, 0.92), rgba(244, 251, 245, 0.82))",
                }}
              >
                <Stack className={styles.sectionHeader} gap="sm">
                  <span style={{ ...moduleEyebrowStyle, color: "#2b7a46" }}>
                    Generator
                  </span>
                  <h2
                    style={{
                      ...sectionTitleStyle,
                      fontSize: "1.05rem",
                      margin: 0,
                    }}
                  >
                    Załaduj przykładowe dane
                  </h2>
                </Stack>
                <p style={{ ...mutedParagraphStyle, margin: 0 }}>
                  Wczyta gotowy przykładowy dump z dynamicznymi datami i wagą z
                  bieżącego miesiąca.
                </p>
                <Button
                  style={{
                    border: 0,
                    padding: "7px 9px",
                    background: "linear-gradient(135deg, #2f8f57, #49b36f)",
                    color: "#ffffff",
                    boxShadow: "0 18px 30px rgba(54, 143, 87, 0.24)",
                  }}
                  onClick={() => void onLoadSampleData()}
                >
                  Załaduj przykładowe dane
                </Button>
              </Stack>
            </Panel>

            <div style={settingsMainColumnStyle} className={styles.formSection}>
              <AthleteFormWidget
                athleteFormMode={athleteFormMode}
                athleteForm={athleteForm}
                setAthleteForm={setAthleteForm}
                sections={sections}
                showSectionField={false}
                panelClassName={styles.formPanelShell}
                validationMessage={validationMessage}
                onAthleteFormSubmit={handleAthleteFormSubmit}
                onResetAthleteForm={onResetAthleteForm}
              />
            </div>
          </Stack>
        </div>
      </main>

      {isImportPreviewOpen && importPreview ? (
        <ImportPreviewModalWidget
          preview={importPreview}
          isImporting={isImportingBackup}
          onConfirmImport={onConfirmImportPreview}
          onCloseImportPreview={onCloseImportPreview}
        />
      ) : null}
    </>
  );
}
