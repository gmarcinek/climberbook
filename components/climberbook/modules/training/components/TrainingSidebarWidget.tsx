"use client";

import type { FormEvent, ReactNode } from "react";
import {
  mobileDrawerBackdropStyle,
  mobileDrawerOverlayStyle,
  mobileDrawerSheetStyle,
} from "@/components/climberbook/common/styles";
import {
  TrainingSidebar,
  type TrainingDraftValues,
} from "@/components/training-calendar/TrainingSidebar";
import type { TrainingRecord, TrainingSurface } from "@/lib/climbs-db";

type TrainingSidebarWidgetProps = {
  selectedDate: string | null;
  selectedDayTrainings: TrainingRecord[];
  visibleRangeTrainings: TrainingRecord[];
  today: string;
  trainingDraft: TrainingDraftValues;
  validationMessage?: string;
  editingTrainingId: number | null;
  surfaceOptions: Array<{ value: TrainingSurface; label: string }>;
  onTrainingDraftChange: (draft: TrainingDraftValues) => void;
  onToggleSurface: (surface: TrainingSurface) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSelectDate: (date: string) => void;
  onEditTraining: (training: TrainingRecord) => void;
  onDeleteTraining: (training: TrainingRecord) => void;
  onResetSelection: () => void;
  onCancelEdit: () => void;
};

type TrainingSidebarDrawerProps = {
  children: ReactNode;
  onClose: () => void;
};

export function TrainingSidebarWidget(props: TrainingSidebarWidgetProps) {
  return <TrainingSidebar {...props} />;
}

export function TrainingSidebarDrawer({
  children,
  onClose,
}: TrainingSidebarDrawerProps) {
  return (
    <div style={mobileDrawerOverlayStyle}>
      <button
        type="button"
        aria-label="Zamknij drawer"
        onClick={onClose}
        style={mobileDrawerBackdropStyle}
      />
      <div style={mobileDrawerSheetStyle}>{children}</div>
    </div>
  );
}
