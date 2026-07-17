"use client";

import { FormEvent, useState } from "react";
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
  buttonStyle,
  chartCardStyle,
  fieldStyle,
  formStyle,
  ghostButtonStyle,
  inputStyle,
  listCardHeaderStyle,
  listCardStyle,
  metricCardStyle,
  metricValueStyle,
  moduleEyebrowStyle,
  panelHeadingStyle,
  scrollListStyle,
  sectionTitleStyle,
  softPillStyle,
  softTagStyle,
  weightEntryModalOverlayStyle,
  weightEntryModalStyle,
} from "@/components/climberbook/common/styles";
import { FormActions } from "@/components/climberbook/common/FormLayout";
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
  onWeightEntrySubmit: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
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
    recentWeightEntries,
  } = props;
  const [isWeightEntryModalOpen, setIsWeightEntryModalOpen] = useState(false);
  const responsiveMetricCardStyle = isMobileLayout
    ? { ...metricCardStyle, padding: 0, background: "transparent" }
    : metricCardStyle;
  const responsiveWeightEntryCardStyle = isMobileLayout
    ? { ...listCardStyle, padding: "4px 4px" }
    : listCardStyle;

  async function handleWeightEntryModalSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    const wasSaved = await onWeightEntrySubmit(event);

    if (wasSaved) {
      setIsWeightEntryModalOpen(false);
    }
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
          <button
            type="button"
            onClick={() => setIsWeightEntryModalOpen(true)}
            style={{ ...buttonStyle, justifySelf: "start" }}
          >
            Dodaj pomiar
          </button>
        </div>
        <WeightTrendChart
          entries={weightChartEntries}
          chartRange={chartRange}
        />
      </section>

      {isWeightEntryModalOpen && (
        <div
          style={weightEntryModalOverlayStyle}
          role="presentation"
          onMouseDown={() => setIsWeightEntryModalOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="weight-entry-modal-title"
            style={weightEntryModalStyle}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div style={panelHeadingStyle}>
              <div>
                <span style={moduleEyebrowStyle}>Pomiar wagi</span>
                <h3 id="weight-entry-modal-title" style={sectionTitleStyle}>
                  Dodaj pomiar
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWeightEntryModalOpen(false)}
                style={ghostButtonStyle}
              >
                Zamknij
              </button>
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

              <FormActions>
                <button type="submit" style={buttonStyle}>
                  Zapisz pomiar
                </button>
              </FormActions>
            </form>
          </section>
        </div>
      )}

      <section style={chartCardStyle}>
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Szybki przegląd</span>
            <h3 style={sectionTitleStyle}>Ostatnie wpisy</h3>
          </div>
          <span style={softPillStyle}>Max 28</span>
        </div>

        <ScrollPane viewportStyle={scrollListStyle}>
          {recentWeightEntries.length === 0 && (
            <EmptyState message="Nie ma jeszcze osobnych pomiarów wagi." />
          )}
          {recentWeightEntries.slice(0, 28).map((entry) => (
            <article
              key={`${entry.id ?? entry.createdAt}-${entry.date}`}
              style={responsiveWeightEntryCardStyle}
            >
              <div style={listCardHeaderStyle}>
                <strong>{entry.weightKg.toFixed(1)} kg</strong>
                <span style={softPillStyle}>
                  {entry.date} {entry.time}
                </span>
              </div>
            </article>
          ))}
        </ScrollPane>
      </section>
    </div>
  );
}

export { RopeTrainingGradesChart } from "@/components/climberbook/common/charts/SessionGradesChart";
export { TrainingCaloriesChart } from "@/components/climberbook/common/charts/TrainingCaloriesChart";
export { WeightTrendChart } from "@/components/climberbook/common/charts/WeightTrendChart";
