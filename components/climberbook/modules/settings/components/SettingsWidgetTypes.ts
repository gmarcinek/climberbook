import type {
  ChangeEvent,
  Dispatch,
  DragEvent,
  FormEvent,
  RefObject,
  SetStateAction,
} from "react";
import type { UserProfileDraft } from "@/components/climberbook/common/training";
import type {
  AthleteExportOptions,
  AthleteRecord,
  DatabaseImportPreview,
  FullDatabaseImportOptions,
  FullDatabaseExportOptions,
  SectionRecord,
  UserSex,
} from "@/lib/climbs-db";
export type AthleteFormDraft = {
  nick: string;
  email: string;
  firstName: string;
  lastName: string;
  sectionId: string;
  birthDate: string;
  sex: UserSex;
  heightCm: string;
  weightKg: string;
};
export type SettingsTab = "profil" | "zespol" | "zaawansowane";
export type ModuleMeta = {
  title: string;
  eyebrow: string;
  description: string;
};
export type SettingsHeaderWidgetProps = {
  meta: ModuleMeta;
  accountEmail: string | null;
};
export type SettingsTabsWidgetProps = {
  settingsTab: SettingsTab;
};
export type ProfileMetricsWidgetProps = {
  profileDraft: UserProfileDraft;
  weightEntries: import("@/lib/climbs-db").WeightEntryRecord[];
};
export type ProfileFormWidgetProps = {
  activeAthlete: AthleteRecord | null;
  accountEmail: string | null;
  profileDraft: UserProfileDraft;
  weightEntries: import("@/lib/climbs-db").WeightEntryRecord[];
  setProfileDraft: Dispatch<SetStateAction<UserProfileDraft>>;
  onSettingsSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStartAthleteEdit: (athlete: AthleteRecord) => Promise<void>;
};
export type DatabaseBackupWidgetProps = {
  backupImportInputRef: RefObject<HTMLInputElement | null>;
  athletes: AthleteRecord[];
  profileAthleteId: string | null;
  onDatabaseExport: (options: FullDatabaseExportOptions) => Promise<void>;
  onDatabaseImport: (event: ChangeEvent<HTMLInputElement>) => void;
  isBackupDropActive: boolean;
  setIsBackupDropActive: Dispatch<SetStateAction<boolean>>;
  onBackupDrop: (event: DragEvent<HTMLDivElement>) => void;
};
export type ImportPreviewModalWidgetProps = {
  preview: DatabaseImportPreview;
  isImporting: boolean;
  onConfirmImport: (options: FullDatabaseImportOptions) => Promise<void>;
  onCloseImportPreview: () => void;
};
export type TeamRosterSettingsWidgetProps = {
  athletes: AthleteRecord[];
  activeAthleteId: string | null;
  sections: SectionRecord[];
  onAddAthlete: () => void;
  onAssignAthleteSection: (
    athlete: AthleteRecord,
    sectionId: string,
  ) => Promise<void>;
  onAthleteExport: (
    athlete: AthleteRecord,
    options: AthleteExportOptions,
  ) => Promise<void>;
  onStartAthleteEdit: (athlete: AthleteRecord) => Promise<void>;
  onDeleteAthlete: (athlete: AthleteRecord) => Promise<void>;
};
export type SectionManagementWidgetProps = {
  sections: SectionRecord[];
  facilities: import("@/lib/climbs-db").FacilityRecord[];
  onAddSection: () => void;
  onUpdateSection?: (section: SectionRecord, name: string) => Promise<void>;
  onDeleteSection: (section: SectionRecord) => Promise<void>;
};
export type AthleteFormWidgetProps = {
  athleteFormMode: "add" | "edit";
  athleteForm: AthleteFormDraft;
  setAthleteForm: Dispatch<SetStateAction<AthleteFormDraft>>;
  sections: SectionRecord[];
  showSectionField?: boolean;
  panelClassName?: string;
  validationMessage?: string;
  onAthleteFormSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => void | Promise<boolean>;
  onResetAthleteForm: () => void;
  panelPadding?: import("@/components/climberbook/common/Panel").PanelPadding;
  panelStyle?: CSSProperties;
};
export type DangerZoneWidgetProps = {
  setIsDatabaseDeleteModalOpen: Dispatch<SetStateAction<boolean>>;
};
export type DatabaseDeleteModalWidgetProps = {
  databaseDeleteConfirmation: string;
  setDatabaseDeleteConfirmation: Dispatch<SetStateAction<string>>;
  onDatabaseDelete: (event: FormEvent<HTMLFormElement>) => void;
  onCloseDatabaseDeleteModal: () => void;
};
