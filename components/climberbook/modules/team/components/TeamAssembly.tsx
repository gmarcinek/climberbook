"use client";

import {
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { moduleContentStyle } from "@/components/climberbook/common/styles";
import { LayoutMaxWidthContent } from "@/components/climberbook/layout/LayoutMaxWidthContent";
import { Stack } from "@/components/climberbook/common/Stack";
import { TeamHeaderWidget } from "./TeamHeaderWidget";
import { TeamManagementWidget } from "./TeamManagementWidget";
import { TeamRosterWidget } from "./TeamRosterWidget";
import { TeamWeightChartWidget } from "./TeamWeightChartWidget";
import type { AthleteFormDraft } from "@/components/climberbook/modules/settings/components/SettingsWidgetTypes";
import type {
  AthleteExportOptions,
  AthleteRecord,
  FacilityRecord,
  SectionRecord,
} from "@/lib/climbs-db";

type TeamSummary = {
  athlete: AthleteRecord;
  trainingCount: number;
  volume: number;
  latestWeight: number | null;
};
type TeamAssemblyProps = {
  moduleMeta: { eyebrow: string; title: string };
  athletes: AthleteRecord[];
  sections: SectionRecord[];
  teamTrainingsCount: number;
  teamSummaryGroups: Array<{
    id: string;
    name: string;
    summaries: TeamSummary[];
  }>;
  activeAthleteId: string | null;
  onSelectAthlete: (athleteId: string) => void;
  teamWeightChartData: Array<Record<string, number | string>>;
  facilities: FacilityRecord[];
  athleteFormMode: "add" | "edit";
  athleteForm: AthleteFormDraft;
  status: string;
  newSectionName: string;
  setAthleteForm: Dispatch<SetStateAction<AthleteFormDraft>>;
  setNewSectionName: Dispatch<SetStateAction<string>>;
  onAddSection: (
    event: FormEvent<HTMLFormElement>,
    facilityId?: string,
  ) => void;
  onUpdateSection: (section: SectionRecord, name: string) => Promise<void>;
  onDeleteSection: (section: SectionRecord) => Promise<void>;
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
  onAthleteFormSubmit: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  onResetAthleteForm: () => void;
};

export function TeamAssembly({
  moduleMeta,
  athletes,
  sections,
  teamTrainingsCount,
  teamSummaryGroups,
  activeAthleteId,
  onSelectAthlete,
  teamWeightChartData,
  facilities,
  athleteFormMode,
  athleteForm,
  status,
  newSectionName,
  setAthleteForm,
  setNewSectionName,
  onAddSection,
  onUpdateSection,
  onDeleteSection,
  onAssignAthleteSection,
  onAthleteExport,
  onStartAthleteEdit,
  onDeleteAthlete,
  onAthleteFormSubmit,
  onResetAthleteForm,
}: TeamAssemblyProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "management">(
    "management",
  );

  return (
    <LayoutMaxWidthContent style={moduleContentStyle}>
      <TeamHeaderWidget
        moduleMeta={moduleMeta}
        athletesCount={athletes.length}
        teamTrainingsCount={teamTrainingsCount}
      />
      <div
        style={{
          display: "flex",
          gap: 4,
          flexWrap: "wrap",
          borderBottom: "1px solid var(--component-settings-tab-border)",
        }}
      >
        {[
          ["management", "Zarządzanie"],
          ["overview", "Wyniki"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key as "overview" | "management")}
            style={{
              border: 0,
              borderBottom:
                activeTab === key
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
              background: "transparent",
              padding: "8px 12px",
              cursor: "pointer",
              fontSize: "0.9rem",
              color: activeTab === key ? "var(--text)" : "var(--muted)",
              fontWeight: activeTab === key ? 700 : 500,
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {activeTab === "overview" ? (
        <>
          <TeamRosterWidget
            athletesCount={athletes.length}
            teamSummaryGroups={teamSummaryGroups}
            activeAthleteId={activeAthleteId}
            onSelectAthlete={onSelectAthlete}
          />
          <TeamWeightChartWidget
            athletes={athletes}
            teamWeightChartData={teamWeightChartData}
          />
        </>
      ) : (
        <TeamManagementWidget
          athletes={athletes}
          activeAthleteId={activeAthleteId}
          sections={sections}
          facilities={facilities}
          athleteFormMode={athleteFormMode}
          athleteForm={athleteForm}
          status={status}
          newSectionName={newSectionName}
          setAthleteForm={setAthleteForm}
          setNewSectionName={setNewSectionName}
          onAddSection={onAddSection}
          onUpdateSection={onUpdateSection}
          onDeleteSection={onDeleteSection}
          onAssignAthleteSection={onAssignAthleteSection}
          onAthleteExport={onAthleteExport}
          onStartAthleteEdit={onStartAthleteEdit}
          onDeleteAthlete={onDeleteAthlete}
          onAthleteFormSubmit={onAthleteFormSubmit}
          onResetAthleteForm={onResetAthleteForm}
        />
      )}
    </LayoutMaxWidthContent>
  );
}
