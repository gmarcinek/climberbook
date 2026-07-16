"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState, MetricCard } from "@/components/climberbook/common/charts";
import {
  headerBadgeRowStyle,
  headerBadgeStyle,
  eyebrowStyle,
  listCardHeaderStyle,
  listCardStyle,
  moduleContainerStyle,
  moduleContentStyle,
  moduleEyebrowStyle,
  moduleIntroStyle,
  mutedParagraphStyle,
  pageTitleStyle,
  panelHeadingStyle,
  panelStyle,
  scrollListStyle,
  sectionTitleStyle,
  softPillStyle,
  softTagStyle,
  statsGridStyle,
  twoColumnLayoutStyle,
} from "@/components/climberbook/common/styles";

type WeeklyTrainingStat = {
  week: string;
  duration: number;
  attempts: number;
};

type GradeDistributionItem = {
  grade: string;
  count: number;
};

type AnalyticsModuleProps = {
  title: string;
  eyebrow: string;
  description: string;
  trainingCount: number;
  averageWeight: string;
  totalTrainingTime: number;
  totalCalories: number;
  totalAttempts: number;
  chartRangeLabel: string;
  weeklyTrainingStats: WeeklyTrainingStat[];
  gradeDistribution: GradeDistributionItem[];
  highestGrade: string;
};

export function AnalyticsModule({
  title,
  eyebrow,
  description,
  trainingCount,
  averageWeight,
  totalTrainingTime,
  totalCalories,
  totalAttempts,
  chartRangeLabel,
  weeklyTrainingStats,
  gradeDistribution,
  highestGrade,
}: AnalyticsModuleProps) {
  return (
    <div style={{ ...moduleContainerStyle, ...moduleContentStyle }}>
      <div style={moduleIntroStyle}>
        <div>
          <p style={eyebrowStyle}>{eyebrow}</p>
          <h1 style={pageTitleStyle}>{title}</h1>
          <p style={mutedParagraphStyle}>{description}</p>
        </div>

        <div style={headerBadgeRowStyle}>
          <span style={headerBadgeStyle}>Treningi: {trainingCount}</span>
          <span style={headerBadgeStyle}>Średnia: {averageWeight} kg</span>
          <span style={headerBadgeStyle}>Kalorie: {totalCalories}</span>
        </div>
      </div>

      <div style={statsGridStyle}>
        <MetricCard
          label="Liczba treningów"
          value={String(trainingCount)}
          detail="Wszystkie zapisane sesje"
        />
        <MetricCard
          label="Łączny czas"
          value={`${totalTrainingTime} min`}
          detail="Suma czasu treningowego"
        />
        <MetricCard
          label="Średnia waga"
          value={`${averageWeight} kg`}
          detail="Na podstawie wpisów treningowych"
        />
        <MetricCard
          label="Łączne wstawki"
          value={String(totalAttempts)}
          detail="Suma prób ze wszystkich sesji"
        />
      </div>

      <div style={twoColumnLayoutStyle}>
        <section style={panelStyle}>
          <div style={panelHeadingStyle}>
            <div>
              <span style={moduleEyebrowStyle}>Objętość</span>
              <h2 style={sectionTitleStyle}>Tygodniowy rytm treningu</h2>
            </div>
            <span style={softTagStyle}>{chartRangeLabel}</span>
          </div>

          {weeklyTrainingStats.length === 0 ? (
            <EmptyState message="Dodaj treningi, aby zobaczyć tygodniowy rytm." />
          ) : (
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyTrainingStats}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(28, 61, 89, 0.12)"
                  />
                  <XAxis
                    dataKey="week"
                    tickFormatter={(value) => value.slice(5)}
                  />
                  <YAxis yAxisId="minutes" />
                  <YAxis yAxisId="attempts" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar
                    yAxisId="minutes"
                    dataKey="duration"
                    name="Minuty"
                    fill="#168f91"
                  />
                  <Bar
                    yAxisId="attempts"
                    dataKey="attempts"
                    name="Wstawki"
                    fill="#e19a24"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section style={panelStyle}>
          <div style={panelHeadingStyle}>
            <div>
              <span style={moduleEyebrowStyle}>Wyceny</span>
              <h2 style={sectionTitleStyle}>Rozkład i maksimum</h2>
            </div>
            <span style={softTagStyle}>Najwyższa: {highestGrade}</span>
          </div>

          <div style={scrollListStyle}>
            {gradeDistribution.length === 0 && (
              <EmptyState message="Nie ma jeszcze wybranych wycen w treningach." />
            )}
            {gradeDistribution.map((grade) => (
              <article key={grade.grade} style={listCardStyle}>
                <div style={listCardHeaderStyle}>
                  <strong>{grade.grade}</strong>
                  <span style={softPillStyle}>{grade.count} wstawek</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
