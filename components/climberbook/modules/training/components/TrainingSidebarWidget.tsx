"use client";

import type { CSSProperties, FormEvent, ReactNode } from "react";
import { mobileDrawerSheetStyle } from "@/components/climberbook/common/styles";
import { Modal } from "@/components/climberbook/common/Modal";
import {
  TrainingPreviewModal,
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
  onPreviewTraining: (training: TrainingRecord) => void;
  onEditTraining: (training: TrainingRecord) => void;
  onDeleteTraining: (training: TrainingRecord) => void;
  onResetSelection: () => void;
  onCancelEdit: () => void;
};

type TrainingPreviewModalWidgetProps = {
  training: TrainingRecord;
  surfaceOptions: Array<{ value: TrainingSurface; label: string }>;
  onClose: () => void;
  onEditTraining: (training: TrainingRecord) => void;
};

type TrainingSidebarDrawerProps = {
  children: ReactNode;
  onClose: () => void;
  sheetStyle?: CSSProperties;
};

export function TrainingSidebarWidget(props: TrainingSidebarWidgetProps) {
  return <TrainingSidebar {...props} />;
}

export function TrainingPreviewModalWidget(
  props: TrainingPreviewModalWidgetProps,
) {
  return <TrainingPreviewModal {...props} />;
}

export function TrainingSidebarDrawer({
  children,
  onClose,
  sheetStyle,
}: TrainingSidebarDrawerProps) {
  return (
    <Modal
      labelledBy="training-form-modal-title"
      onClose={onClose}
      style={{
        ...mobileDrawerSheetStyle,
        ...sheetStyle,
        width: "100%",
        maxWidth: "100%",
        height: "100dvh",
        maxHeight: "100dvh",
        gap: 0,
      }}
    >
      {children}
    </Modal>
  );
}
