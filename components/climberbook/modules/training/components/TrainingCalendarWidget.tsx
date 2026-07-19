"use client";

import { Panel } from "@/components/climberbook/common/Panel";
import { Button } from "@/components/climberbook/common/Button";
import { ScrollPane } from "@/components/climberbook/common/ScrollPane";
import { Stack } from "@/components/climberbook/common/Stack";
import {
  calendarPanelStyle,
  navButtonStyle,
} from "@/components/climberbook/common/styles";
import { TrainingCalendar } from "@/components/training-calendar/TrainingCalendar";
import { TrainingTimelineBar } from "@/components/training-calendar/TrainingTimelineBar";
import { summarizeTrainingType } from "@/components/training-calendar/training-calendar.helpers";
import type { TrainingRecord } from "@/lib/climbs-db";
import sidebarStyles from "@/components/training-calendar/TrainingSidebar.module.css";

type TrainingCalendarWidgetProps = {
  isMobileLayout: boolean;
  showVisibleTrainingList: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  trainingRangeStart: string;
  trainingsByDate: Map<string, TrainingRecord[]>;
  visibleRangeTrainings: TrainingRecord[];
  selectedDate: string | null;
  today: string;
  onSelectDate: (date: string) => void;
  onEditTraining: (training: TrainingRecord) => void;
  onPreviewTraining: (training: TrainingRecord) => void;
};

export function TrainingCalendarWidget({
  isMobileLayout,
  showVisibleTrainingList,
  onPreviousMonth,
  onNextMonth,
  trainingRangeStart,
  trainingsByDate,
  visibleRangeTrainings,
  selectedDate,
  today,
  onSelectDate,
  onEditTraining,
  onPreviewTraining,
}: TrainingCalendarWidgetProps) {
  return (
    <Panel
      as="section"
      padding="none"
      gap="none"
      style={{
        ...calendarPanelStyle,
        gridTemplateRows: "minmax(0, 1fr)",
        height: "100%",
        overflow: "hidden",
        padding: undefined,
        gridColumn: isMobileLayout ? "auto" : 1,
        gridRow: isMobileLayout ? "auto" : 1,
        order: isMobileLayout ? -1 : 0,
      }}
    >
      <ScrollPane
        style={{ height: "100%", minHeight: 0 }}
        viewportStyle={{ height: "100%", minHeight: 0, overflowY: "auto" }}
        contentStyle={{
          display: "flex",
          flexDirection: "column",
          gap: 9,
          minHeight: 0,
          padding: "0 11px 11px",
        }}
      >
        <Stack direction="row" gap="sm" justify="between" align="center" style={{ padding: "11px 0 0" }}>
          <Button size="small" variant="secondary" onClick={onPreviousMonth} style={navButtonStyle}>Wstecz</Button>
          <Button size="small" variant="secondary" onClick={onNextMonth} style={navButtonStyle}>Dalej</Button>
        </Stack>
        <div style={{ minHeight: 0, flex: "none" }}>
          <TrainingCalendar anchorMonthStart={trainingRangeStart} monthCount={1} visibleColumns={1} useScrollPane={!showVisibleTrainingList} fillHeight={!showVisibleTrainingList} trainingsByDate={trainingsByDate} selectedDate={selectedDate} today={today} onSelectDate={onSelectDate} />
        </div>
        {showVisibleTrainingList && (
          <div className={sidebarStyles.trainingSidebar__visibleList}>
            <div className={sidebarStyles.trainingSidebar__panelHeader}>
              <div><h2 className={sidebarStyles.trainingSidebar__title}>Treningi</h2></div>
              <div className={sidebarStyles.trainingSidebar__headerActions}><Button onClick={() => onSelectDate(today)} variant="tertiary" className={sidebarStyles.trainingSidebar__submitButton}>+ Trening</Button></div>
            </div>
            {visibleRangeTrainings.length === 0 && <p className={sidebarStyles.trainingSidebar__helperText}>W wybranym zakresie jeszcze nie ma treningów.</p>}
            {visibleRangeTrainings.map((training) => (
              <article key={`${training.id ?? training.createdAt}-${training.time}`} className={sidebarStyles.trainingSidebar__trainingCard}>
                <div className={sidebarStyles.trainingSidebar__trainingButtonHeader}><strong>{summarizeTrainingType(training)}</strong><span className={sidebarStyles.trainingSidebar__pill}>{training.date}</span></div>
                <div className={sidebarStyles.trainingSidebar__metaLine}><span>{training.durationMinutes} min · {training.caloriesBurned} kcal</span></div>
                <TrainingTimelineBar time={training.time} durationMinutes={training.durationMinutes} difficultyNotes={training.difficultyNotes} difficultyBySurface={training.difficultyBySurface} surfaces={training.surfaces} />
                {training.difficultyNotes?.trim() && <div className={sidebarStyles.trainingSidebar__details}><span>Wyceny: {training.difficultyNotes}</span></div>}
                <div className={sidebarStyles.trainingSidebar__cardActions}>
                  <Button size="small" variant="secondary" onClick={() => onEditTraining(training)} className={sidebarStyles.trainingSidebar__linkButton}>Edytuj</Button>
                  <Button size="small" variant="secondary" onClick={() => onPreviewTraining(training)} className={sidebarStyles.trainingSidebar__linkButton}>Podgląd</Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </ScrollPane>
    </Panel>
  );
}
