"use client";

import { useState, type ReactNode, type UIEvent } from "react";
import { Clock, Droplets, Flame, Thermometer } from "lucide-react";
import { Panel } from "@/components/climberbook/common/Panel";
import { Button } from "@/components/climberbook/common/Button";
import { ScrollPane } from "@/components/climberbook/common/ScrollPane";
import { formatDurationMinutes } from "@/components/climberbook/common/training";
import {
  calendarPanelStyle,
  calendarNavLabelStyle,
  calendarNavStyle,
  navButtonStyle,
} from "@/components/climberbook/common/styles";
import { TrainingCalendar } from "@/components/training-calendar/TrainingCalendar";
import { TrainingTimelineBar } from "@/components/training-calendar/TrainingTimelineBar";
import {
  addMonths,
  formatTrainingCardDateTime,
  getMonthLabel,
  summarizeTrainingType,
  toDate,
} from "@/components/training-calendar/training-calendar.helpers";
import type { TrainingRecord } from "@/lib/climbs-db";
import sidebarStyles from "@/components/training-calendar/TrainingSidebar.module.css";

type TrainingCalendarWidgetProps = {
  isMobileLayout: boolean;
  isWideLayout: boolean;
  showVisibleTrainingList: boolean;
  selectedDayContent?: ReactNode;
  secondaryTab?: {
    label: string;
    content: ReactNode;
    headerAction?: ReactNode;
  };
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  trainingRangeStart: string;
  trainingsByDate: Map<string, TrainingRecord[]>;
  visibleRangeTrainings: TrainingRecord[];
  selectedDate: string | null;
  today: string;
  onSelectDate: (date: string) => void;
  onResetSelection: () => void;
  onEditTraining: (training: TrainingRecord) => void;
  onPreviewTraining: (training: TrainingRecord) => void;
};

export function TrainingCalendarWidget({
  isMobileLayout,
  isWideLayout,
  showVisibleTrainingList,
  selectedDayContent,
  secondaryTab,
  onPreviousMonth,
  onNextMonth,
  trainingRangeStart,
  trainingsByDate,
  visibleRangeTrainings,
  selectedDate,
  today,
  onSelectDate,
  onResetSelection,
  onEditTraining,
  onPreviewTraining,
}: TrainingCalendarWidgetProps) {
  const calendarAnchorMonthStart = isWideLayout
    ? addMonths(trainingRangeStart, -1)
    : trainingRangeStart;
  const anchorMonthDate = toDate(calendarAnchorMonthStart);
  const nextMonthDate = toDate(addMonths(calendarAnchorMonthStart, 1));
  const calendarMonthLabel = isWideLayout
    ? `${getMonthLabel(anchorMonthDate.getMonth())}-${getMonthLabel(nextMonthDate.getMonth())}`
    : getMonthLabel(anchorMonthDate.getMonth());
  const calendarYear =
    isWideLayout &&
    anchorMonthDate.getFullYear() !== nextMonthDate.getFullYear()
      ? `${anchorMonthDate.getFullYear()}-${nextMonthDate.getFullYear()}`
      : String(anchorMonthDate.getFullYear());
  const [isCalendarHeaderPinned, setIsCalendarHeaderPinned] = useState(false);

  const handleViewportScroll = (event: UIEvent<HTMLDivElement>) => {
    const nextPinned = event.currentTarget.scrollTop > 0;

    setIsCalendarHeaderPinned((current) =>
      current === nextPinned ? current : nextPinned,
    );
  };

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
        viewportStyle={{
          height: "100%",
          minHeight: 0,
          overflowY: "auto",
          background: "var(--component-calendar-viewport-background)",
        }}
        onViewportScroll={handleViewportScroll}
        contentStyle={{
          display: "flex",
          flexDirection: "column",
          gap: 9,
          minHeight: 0,
          padding: "0 11px 11px",
        }}
      >
        <div
          style={{
            position: "sticky",
            top: isCalendarHeaderPinned ? -2 : 6,
            zIndex: 2,
            padding: "8px 0",
            marginLeft: isCalendarHeaderPinned ? -11 : 0,
            marginRight: isCalendarHeaderPinned ? -11 : 0,
            marginTop: 0,
            marginBottom: 8,
            borderTop: "var(--component-calendar-sticky-border)",
            borderBottom: "var(--component-calendar-sticky-border)",
            background: isCalendarHeaderPinned
              ? "var(--component-calendar-sticky-background)"
              : "var(--component-calendar-sticky-background-idle)",
            boxShadow: isCalendarHeaderPinned
              ? "var(--component-calendar-sticky-shadow)"
              : "none",
            textTransform: "capitalize",
            transition:
              "top 180ms ease, margin 180ms ease, padding 180ms ease, box-shadow 180ms ease",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              opacity: isCalendarHeaderPinned ? 1 : 0,
              background: "var(--component-calendar-sticky-background)",
              transition: "opacity 180ms ease",
            }}
          />
          <div
            style={{
              ...calendarNavStyle,
              position: "relative",
              zIndex: 1,
              paddingLeft: isCalendarHeaderPinned ? 11 : 0,
              paddingRight: isCalendarHeaderPinned ? 11 : 0,
              transition: "padding 180ms ease",
            }}
          >
            <Button
              size="small"
              variant="secondary"
              aria-label="Poprzedni miesiąc"
              title="Poprzedni miesiąc"
              onClick={onPreviousMonth}
              style={{
                ...navButtonStyle,
                width: 36,
                minWidth: 36,
                height: 36,
                minHeight: 36,
                padding: 0,
                placeItems: "center",
                alignSelf: "center",
              }}
            >
              <span aria-hidden style={{ fontSize: "2rem", lineHeight: 0.35 }}>
                ‹
              </span>
            </Button>
            <div style={calendarNavLabelStyle}>
              <span>{calendarMonthLabel}</span>
              <span
                style={{
                  color: "var(--component-calendar-highlight)",
                  fontWeight: 600,
                }}
              >
                {` ${calendarYear}`}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              <Button
                size="small"
                variant="secondary"
                aria-label="Następny miesiąc"
                title="Następny miesiąc"
                onClick={onNextMonth}
                style={{
                  ...navButtonStyle,
                  width: 36,
                  minWidth: 36,
                  height: 36,
                  minHeight: 36,
                  padding: 0,
                  placeItems: "center",
                }}
              >
                <span
                  aria-hidden
                  style={{ fontSize: "2rem", lineHeight: 0.35 }}
                >
                  ›
                </span>
              </Button>
            </div>
          </div>
        </div>
        <div style={{ minHeight: 0, flex: "none" }}>
          <TrainingCalendar
            anchorMonthStart={calendarAnchorMonthStart}
            monthCount={isWideLayout ? 2 : 1}
            visibleColumns={isWideLayout ? 2 : 1}
            useScrollPane={!showVisibleTrainingList}
            fillHeight={!showVisibleTrainingList}
            showMonthHeader={false}
            trainingsByDate={trainingsByDate}
            selectedDate={selectedDate}
            today={today}
            onSelectDate={onSelectDate}
          />
        </div>
        {showVisibleTrainingList && (
          <VisibleTrainingList
            trainings={visibleRangeTrainings}
            onAddTraining={() => onSelectDate(today)}
            onCancelTraining={onResetSelection}
            onEditTraining={onEditTraining}
            onPreviewTraining={onPreviewTraining}
            content={selectedDayContent}
            secondaryTab={secondaryTab}
          />
        )}
      </ScrollPane>
    </Panel>
  );
}

export function VisibleTrainingList({
  trainings,
  onAddTraining,
  onCancelTraining,
  showAddTraining = true,
  standalone = false,
  content,
  secondaryTab,
  onEditTraining,
  onPreviewTraining,
}: {
  trainings: TrainingRecord[];
  onAddTraining: () => void;
  onCancelTraining?: () => void;
  showAddTraining?: boolean;
  standalone?: boolean;
  content?: ReactNode;
  secondaryTab?: {
    label: string;
    content: ReactNode;
    headerAction?: ReactNode;
  };
  onEditTraining: (training: TrainingRecord) => void;
  onPreviewTraining: (training: TrainingRecord) => void;
}) {
  const [activeTab, setActiveTab] = useState<"trainings" | "secondary">(
    "trainings",
  );
  const isSecondaryTabActive = activeTab === "secondary" && secondaryTab;

  return (
    <div
      className={[
        sidebarStyles.trainingSidebar__visibleList,
        standalone
          ? sidebarStyles["trainingSidebar__visibleList--standalone"]
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={sidebarStyles.trainingSidebar__panelHeader}>
        <div>
          {secondaryTab ? (
            <div role="tablist" aria-label="Zawartość panelu treningów">
              <button
                type="button"
                role="tab"
                aria-selected={!isSecondaryTabActive}
                className={sidebarStyles.trainingSidebar__title}
                style={tabStyle(!isSecondaryTabActive)}
                onClick={() => setActiveTab("trainings")}
              >
                Treningi
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={Boolean(isSecondaryTabActive)}
                className={sidebarStyles.trainingSidebar__title}
                style={tabStyle(Boolean(isSecondaryTabActive))}
                onClick={() => setActiveTab("secondary")}
              >
                {secondaryTab.label}
              </button>
            </div>
          ) : (
            <h2 className={sidebarStyles.trainingSidebar__title}>Treningi</h2>
          )}
        </div>
        {isSecondaryTabActive ? (
          secondaryTab.headerAction
        ) : showAddTraining ? (
          <div className={sidebarStyles.trainingSidebar__headerActions}>
            <Button
              onClick={content ? onCancelTraining : onAddTraining}
              variant={content ? "secondary" : "primary"}
              className={
                standalone
                  ? undefined
                  : content
                    ? sidebarStyles.trainingSidebar__cancelAction
                    : sidebarStyles.trainingSidebar__submitButton
              }
            >
              {content ? "Anuluj" : "+ Trening"}
            </Button>
          </div>
        ) : null}
      </div>
      {isSecondaryTabActive
        ? secondaryTab.content
        : (content ??
          (trainings.length === 0 && (
            <p className={sidebarStyles.trainingSidebar__helperText}>
              W wybranym zakresie jeszcze nie ma treningów.
            </p>
          )))}
      {!isSecondaryTabActive &&
        !content &&
        trainings.map((training) => (
          <article
            key={`${training.id ?? training.createdAt}-${training.time}`}
            className={sidebarStyles.trainingSidebar__trainingCard}
          >
            <div
              className={sidebarStyles.trainingSidebar__trainingButtonHeader}
            >
              <strong>{training.facilityName || "Nie wskazano"}</strong>
              <span className={sidebarStyles.trainingSidebar__pill}>
                {formatTrainingCardDateTime(training.date, training.time)}
              </span>
            </div>
            <div
              className={sidebarStyles.trainingSidebar__trainingButtonHeader}
            >
              <span className={sidebarStyles.trainingSidebar__trainingType}>
                {summarizeTrainingType(training)}
              </span>
            </div>
            <div className={sidebarStyles.trainingSidebar__metaLine}>
              <span className={sidebarStyles.trainingSidebar__metaItem}>
                <Clock size={14} aria-hidden="true" />
                {formatDurationMinutes(training.durationMinutes)}
              </span>
              <span className={sidebarStyles.trainingSidebar__metaItem}>
                <Flame size={14} aria-hidden="true" />
                {training.caloriesBurned} kcal
              </span>
              {training.weatherSnapshot ? (
                <>
                  <span className={sidebarStyles.trainingSidebar__metaItem}>
                    <Thermometer size={14} aria-hidden="true" />
                    {training.weatherSnapshot.apparentTemperatureC.toFixed(1)}°C
                  </span>
                  <span className={sidebarStyles.trainingSidebar__metaItem}>
                    <Droplets size={14} aria-hidden="true" />
                    {Math.round(training.weatherSnapshot.relativeHumidity)}%
                  </span>
                </>
              ) : null}
            </div>
            <TrainingTimelineBar
              time={training.time}
              durationMinutes={training.durationMinutes}
              difficultyNotes={training.difficultyNotes}
              difficultyBySurface={training.difficultyBySurface}
              surfaces={training.surfaces}
            />
            {training.difficultyNotes?.trim() && (
              <div className={sidebarStyles.trainingSidebar__details}>
                <span>Wyceny: {training.difficultyNotes}</span>
              </div>
            )}
            <div className={sidebarStyles.trainingSidebar__cardActions}>
              <Button
                size="small"
                variant="secondary"
                onClick={() => onEditTraining(training)}
                className={sidebarStyles.trainingSidebar__linkButton}
              >
                Edytuj
              </Button>
              <Button
                size="small"
                variant="secondary"
                onClick={() => onPreviewTraining(training)}
                className={sidebarStyles.trainingSidebar__linkButton}
              >
                Podgląd
              </Button>
            </div>
          </article>
        ))}
    </div>
  );
}

function tabStyle(isActive: boolean) {
  return {
    background: "transparent",
    border: 0,
    borderBottom: isActive
      ? "2px solid var(--accent)"
      : "2px solid transparent",
    color: isActive ? "var(--text)" : "var(--muted)",
    cursor: "pointer",
    font: "inherit",
    fontWeight: isActive ? 700 : 500,
    marginRight: 12,
    padding: "0 0 5px",
  };
}
