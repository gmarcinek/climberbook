"use client";

import {
  actionRowStyle,
  buttonStyle,
  ghostButtonStyle,
  moduleContainerStyle,
  moduleContentStyle,
  moduleEyebrowStyle,
  mutedParagraphStyle,
  pageStyle,
  panelStyle,
  sectionTitleStyle,
  settingsMainColumnStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import { MainHeader } from "@/components/climberbook/layout/MainHeader";
import { AthleteFormWidget } from "@/components/climberbook/modules/settings/components/AthleteFormWidget";
import { ImportPreviewModalWidget } from "@/components/climberbook/modules/settings/components/ImportPreviewModalWidget";
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
          <div style={{ ...moduleContainerStyle, ...moduleContentStyle }}>
            <section style={panelStyle}>
              <div style={{ display: "grid", gap: 6 }}>
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
              </div>
              <p style={mutedParagraphStyle}>
                Żeby zacząć pracę w Climberbook, utwórz pierwszego zawodnika
                albo wczytaj istniejącą bazę z pliku JSON.
              </p>
              <div style={actionRowStyle}>
                <input
                  ref={backupImportInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={onDatabaseImport}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() => backupImportInputRef.current?.click()}
                >
                  Import bazy
                </button>
              </div>
            </section>

            <div style={settingsMainColumnStyle}>
              <AthleteFormWidget
                athleteFormMode={athleteFormMode}
                athleteForm={athleteForm}
                setAthleteForm={setAthleteForm}
                sections={sections}
                showSectionField={false}
                validationMessage={validationMessage}
                onAthleteFormSubmit={handleAthleteFormSubmit}
                onResetAthleteForm={onResetAthleteForm}
              />
            </div>
          </div>
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
