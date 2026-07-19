"use client";

import { FormEvent, useState } from "react";
import { Modal } from "@/components/climberbook/common/Modal";
import { Button } from "@/components/climberbook/common/Button";
import { ScrollPane } from "@/components/climberbook/common/ScrollPane";
import { EmptyState } from "@/components/climberbook/common/charts/ChartPrimitives";
import { RopeTrainingGradesChart } from "@/components/climberbook/common/charts/SessionGradesChart";
import { TrainingCaloriesChart } from "@/components/climberbook/common/charts/TrainingCaloriesChart";
import { WeightTrendChart } from "@/components/climberbook/common/charts/WeightTrendChart";
import {
  formatWeightInput,
  parseWeightInput,
  type WeightEntryDraft,
} from "@/components/climberbook/common/training";
import {
  analyticsPanelInnerStyle,
  analyticsStatsGridStyle,
  chartCardStyle,
  deleteButtonStyle,
  fieldStyle,
  formStyle,
  inputStyle,
  listCardHeaderStyle,
  listCardStyle,
  metricCardStyle,
  metricValueStyle,
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  scrollListStyle,
  sectionTitleStyle,
  softPillStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import { FormActions } from "@/components/climberbook/common/FormLayout";
import { useSelectedDates } from "@/contexts/SelectedDatesContext";
import type { TrainingRecord, WeightEntryRecord } from "@/lib/climbs-db";

export {
  EmptyState,
  MetricCard,
} from "@/components/climberbook/common/charts/ChartPrimitives";

export function TrainingAnalyticsPanel(props: {
  isMobileLayout: boolean;
  latestWeightKg: number | null | undefined;
  latestWeightDate: string | null;
  latestWeightChange: number | null;
  averageWeight: string;
  totalTrainingTime: number;
  totalCalories: number;
  weightChartEntries: WeightEntryRecord[];
  trainings: TrainingRecord[];
  chartRange: { start: string; end: string };
  chartRangeLabel: string;
  weightEntryDraft: WeightEntryDraft;
  onWeightEntryDraftChange: (draft: WeightEntryDraft) => void;
  onWeightEntrySubmit: (
    event: FormEvent<HTMLFormElement>,
    entryToUpdate?: WeightEntryRecord | null,
  ) => Promise<boolean>;
  onDeleteWeightEntry: (entry: WeightEntryRecord) => Promise<void>;
  recentWeightEntries: WeightEntryRecord[];
}) {
  const {
    isMobileLayout,
    latestWeightKg,
    latestWeightDate,
    latestWeightChange,
    averageWeight,
    totalTrainingTime,
    totalCalories,
    weightChartEntries,
    trainings,
    chartRange,
    chartRangeLabel,
    weightEntryDraft,
    onWeightEntryDraftChange,
    onWeightEntrySubmit,
    onDeleteWeightEntry,
    recentWeightEntries,
  } = props;
  const { selectedDate } = useSelectedDates();
  const [isWeightEntryModalOpen, setIsWeightEntryModalOpen] = useState(false);
  const [editingWeightEntry, setEditingWeightEntry] =
    useState<WeightEntryRecord | null>(null);
  const [weightEntryPendingDeletion, setWeightEntryPendingDeletion] =
    useState<WeightEntryRecord | null>(null);
  const responsiveMetricCardStyle = isMobileLayout
    ? { ...metricCardStyle, padding: 0, background: "transparent" }
    : metricCardStyle;
  const responsiveWeightEntryCardStyle = isMobileLayout
    ? { ...listCardStyle, padding: "4px 4px" }
    : listCardStyle;

  async function handleWeightEntryModalSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    const wasSaved = await onWeightEntrySubmit(event, editingWeightEntry);

    if (wasSaved) {
      setIsWeightEntryModalOpen(false);
      setEditingWeightEntry(null);
    }
  }

  function openWeightEntryEditor(entry: WeightEntryRecord) {
    setEditingWeightEntry(entry);
    onWeightEntryDraftChange({
      date: entry.date,
      time: entry.time,
      weightKg: formatWeightInput(entry.weightKg),
    });
    setIsWeightEntryModalOpen(true);
  }

  async function handleWeightEntryDeletion() {
    if (!weightEntryPendingDeletion) {
      return;
    }

    await onDeleteWeightEntry(weightEntryPendingDeletion);
    setWeightEntryPendingDeletion(null);
  }

  return (
    <div style={analyticsPanelInnerStyle}>
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Analityka</span>
          <h2 style={sectionTitleStyle}>Waga i trend</h2>
        </div>
        <span style={softTagStyle}>Bieżący miesiąc</span>
      </div>

      <div style={analyticsStatsGridStyle}>
        <article style={responsiveMetricCardStyle}>
          <span style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
            Ostatni pomiar
          </span>
          <strong style={metricValueStyle}>
            {latestWeightKg ? `${latestWeightKg.toFixed(1)} kg` : "-"}
          </strong>
          <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
            {latestWeightDate ?? "Brak wpisu"}
          </span>
        </article>
        <article style={responsiveMetricCardStyle}>
          <span style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
            Zmiana
          </span>
          <strong style={metricValueStyle}>
            {latestWeightChange === null
              ? "-"
              : `${latestWeightChange > 0 ? "+" : ""}${latestWeightChange.toFixed(1)} kg`}
          </strong>
          <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
            Vs poprzedni pomiar
          </span>
        </article>
        <article style={responsiveMetricCardStyle}>
          <span style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
            Średnia
          </span>
          <strong style={metricValueStyle}>
            {averageWeight === "-" ? "-" : `${averageWeight} kg`}
          </strong>
          <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
            Na bazie treningów
          </span>
        </article>
        <article style={responsiveMetricCardStyle}>
          <span style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
            Objętość
          </span>
          <strong style={metricValueStyle}>{totalTrainingTime} min</strong>
          <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
            Kalorie: {totalCalories}
          </span>
        </article>
      </div>

      <section
        style={
          isMobileLayout ? { ...chartCardStyle, padding: 0 } : chartCardStyle
        }
      >
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Treningi</span>
            <h3 style={sectionTitleStyle}>Wyceny na sesję</h3>
          </div>
          <span style={softPillStyle}>Lina, Moon, Kilter i baldy</span>
        </div>
        <RopeTrainingGradesChart
          trainings={trainings}
          chartRange={chartRange}
        />
      </section>

      <section style={chartCardStyle}>
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Kalorie</span>
            <h3 style={sectionTitleStyle}>Dzienne spalanie</h3>
          </div>
          <span style={softPillStyle}>{chartRangeLabel}</span>
        </div>
        <TrainingCaloriesChart trainings={trainings} chartRange={chartRange} />
      </section>

      <section style={chartCardStyle}>
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Wykres wagi</span>
            <h3 style={sectionTitleStyle}>Ostatnie pomiary</h3>
          </div>
          <span style={softPillStyle}>{weightChartEntries.length} pkt</span>
        </div>
        <WeightTrendChart
          entries={weightChartEntries}
          chartRange={chartRange}
        />
      </section>

      {isWeightEntryModalOpen && (
        <Modal
          labelledBy="weight-entry-modal-title"
          onClose={() => {
            setIsWeightEntryModalOpen(false);
            setEditingWeightEntry(null);
          }}
        >
          <div style={panelHeadingStyle}>
            <div>
              <span style={moduleEyebrowStyle}>Pomiar wagi</span>
              <h3 id="weight-entry-modal-title" style={sectionTitleStyle}>
                {editingWeightEntry ? "Edytuj pomiar" : "Dodaj pomiar"}
              </h3>
            </div>
          </div>

          <form onSubmit={handleWeightEntryModalSubmit} style={formStyle}>
            <label style={fieldStyle}>
              Data pomiaru
              <input
                value={weightEntryDraft.date}
                onChange={(event) =>
                  onWeightEntryDraftChange({
                    ...weightEntryDraft,
                    date: event.target.value,
                  })
                }
                type="date"
                required
                style={inputStyle}
              />
            </label>
            <label style={fieldStyle}>
              Godzina pomiaru
              <input
                value={weightEntryDraft.time}
                onChange={(event) =>
                  onWeightEntryDraftChange({
                    ...weightEntryDraft,
                    time: event.target.value,
                  })
                }
                type="time"
                required
                style={inputStyle}
              />
            </label>
            <label style={fieldStyle}>
              Waga (kg)
              <input
                value={weightEntryDraft.weightKg}
                onChange={(event) =>
                  onWeightEntryDraftChange({
                    ...weightEntryDraft,
                    weightKg: event.target.value.replaceAll(",", "."),
                  })
                }
                onBlur={() =>
                  onWeightEntryDraftChange({
                    ...weightEntryDraft,
                    weightKg: formatWeightInput(
                      parseWeightInput(weightEntryDraft.weightKg),
                    ),
                  })
                }
                type="number"
                min="0"
                step="0.1"
                required
                style={inputStyle}
              />
            </label>

            <FormActions
              style={{
                flexDirection: "row",
                flexWrap: "nowrap",
                alignItems: "center",
                justifyContent: "space-between",
                justifySelf: "stretch",
                width: "100%",
              }}
            >
              <Button type="submit" variant="tertiary" style={{ width: "auto" }}>
                Zapisz pomiar
              </Button>
              {editingWeightEntry?.id !== undefined ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsWeightEntryModalOpen(false);
                    setWeightEntryPendingDeletion(editingWeightEntry);
                  }}
                  style={{ ...deleteButtonStyle, width: "auto" }}
                >
                  Usuń pomiar
                </Button>
              ) : null}
            </FormActions>
          </form>
        </Modal>
      )}

      {weightEntryPendingDeletion && (
        <Modal
          labelledBy="weight-entry-delete-modal-title"
          onClose={() => setWeightEntryPendingDeletion(null)}
        >
          <div style={panelHeadingStyle}>
            <div>
              <span style={moduleEyebrowStyle}>Nieodwracalna akcja</span>
              <h3
                id="weight-entry-delete-modal-title"
                style={sectionTitleStyle}
              >
                Usunąć pomiar wagi?
              </h3>
            </div>
          </div>
          <p style={mutedParagraphStyle}>
            Pomiar {weightEntryPendingDeletion.weightKg.toFixed(1)} kg z dnia{" "}
            {weightEntryPendingDeletion.date} o{" "}
            {weightEntryPendingDeletion.time}
            zostanie trwale usunięty.
          </p>
          <FormActions
            style={{
              alignItems: "center",
              justifySelf: "stretch",
              width: "100%",
            }}
          >
            <Button
              variant="secondary"
              onClick={() => setWeightEntryPendingDeletion(null)}
              style={{ width: "auto" }}
            >
              Anuluj
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleWeightEntryDeletion()}
              style={{ ...deleteButtonStyle, width: "auto" }}
            >
              Usuń pomiar
            </Button>
          </FormActions>
        </Modal>
      )}

      <section style={chartCardStyle}>
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Szybki przegląd</span>
            <h3 style={sectionTitleStyle}>Ostatnie wpisy</h3>
          </div>
          <Button
            variant="tertiary"
            onClick={() => setIsWeightEntryModalOpen(true)}
            style={{ justifySelf: "start" }}
          >
            Dodaj pomiar
          </Button>
        </div>

        <ScrollPane viewportStyle={scrollListStyle}>
          {recentWeightEntries.length === 0 && (
            <EmptyState message="Nie ma jeszcze osobnych pomiarów wagi." />
          )}
          {recentWeightEntries.slice(0, 28).map((entry) => (
            <button
              type="button"
              key={`${entry.id ?? entry.createdAt}-${entry.date}`}
              onClick={() => openWeightEntryEditor(entry)}
              style={{
                ...responsiveWeightEntryCardStyle,
                border: 0,
                background:
                  entry.date === selectedDate
                    ? "rgba(23, 111, 134, 0.14)"
                    : responsiveWeightEntryCardStyle.background,
                boxShadow:
                  entry.date === selectedDate
                    ? "inset 3px 0 0 #176f86"
                    : undefined,
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
              }}
            >
              <div style={listCardHeaderStyle}>
                <strong>{entry.weightKg.toFixed(1)} kg</strong>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={softPillStyle}>
                    {entry.date} {entry.time}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </ScrollPane>
      </section>
    </div>
  );
}

export { RopeTrainingGradesChart } from "@/components/climberbook/common/charts/SessionGradesChart";
export { TrainingCaloriesChart } from "@/components/climberbook/common/charts/TrainingCaloriesChart";
export { WeightTrendChart } from "@/components/climberbook/common/charts/WeightTrendChart";
