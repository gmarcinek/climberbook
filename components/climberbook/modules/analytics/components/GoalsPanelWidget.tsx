"use client";

import { useState, type FormEvent } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/climberbook/common/Button";
import {
  NumericStepperControl,
  Select,
} from "@/components/climberbook/common/FormControls";
import { FormActions } from "@/components/climberbook/common/FormLayout";
import { Panel } from "@/components/climberbook/common/Panel";
import { WeightTrendChart } from "@/components/climberbook/common/charts/WeightTrendChart";
import formStyles from "@/components/training-calendar/TrainingSidebar.module.css";
import styles from "./GoalsPanelWidget.module.css";
import type {
  AscentRecord,
  GoalRecord,
  TrainingRecord,
  TrainingFocus,
  WeightEntryRecord,
} from "@/lib/climbs-db";

type WeeklyGoalKind = "training_count" | "strength_coin" | "aerobic_coin";
type FixedGoalKind = WeeklyGoalKind | "route_grade";
type GoalDraft = {
  kind: FixedGoalKind;
  title: string;
  targetValue: string;
  targetGrade: string;
};

const fixedGoalKinds = [
  "training_count",
  "strength_coin",
  "aerobic_coin",
  "route_grade",
] as const;
const goalLabels: Record<FixedGoalKind, string> = {
  training_count: "Objętość tygodniowa",
  strength_coin: "Objętość siłowa",
  aerobic_coin: "Objętość tlenowa",
  route_grade: "Cyfra",
};
const goalDescriptions: Record<FixedGoalKind, string> = {
  training_count: "Treningi w tygodniu",
  strength_coin: "Treningi siłowe w tygodniu",
  aerobic_coin: "Treningi wytrzymałościowe w tygodniu",
  route_grade: "Docelowa wycena",
};
const routeGradeOptions = [
  "6a",
  "6a+",
  "6b",
  "6b+",
  "6c",
  "6c+",
  "7a",
  "7a+",
  "7b",
  "7b+",
  "7c",
  "7c+",
  "8a",
  "8a+",
  "8b",
  "8b+",
  "8c",
  "8c+",
  "9a",
];
const strengthFocuses: readonly TrainingFocus[] = [
  "strength",
  "strength_endurance",
  "finger_strength",
  "contact_strength",
];
const aerobicFocuses: readonly TrainingFocus[] = [
  "specific_endurance",
  "intervals",
  "general_conditioning",
];

function createDraft(kind: FixedGoalKind): GoalDraft {
  return {
    kind,
    title: goalLabels[kind],
    targetValue: kind === "route_grade" ? "1" : "3",
    targetGrade: kind === "route_grade" ? "6a" : "",
  };
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function weekStart(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - (value.getUTCDay() || 7) + 1);
  return value.toISOString().slice(0, 10);
}

function gradeValue(value: string) {
  const match = value
    .trim()
    .toLowerCase()
    .match(/^(\d+)([abc])?(\+)?/);
  if (!match) return null;
  return (
    Number(match[1]) +
    ({ a: 0, b: 1 / 3, c: 2 / 3 }[match[2] ?? "a"] ?? 0) +
    (match[3] ? 1 / 6 : 0)
  );
}

function isMatchingTraining(training: TrainingRecord, kind: WeeklyGoalKind) {
  if (kind === "training_count") return true;
  const focus = training.loadProfile?.focus;
  return kind === "strength_coin"
    ? focus !== undefined && strengthFocuses.includes(focus)
    : focus !== undefined && aerobicFocuses.includes(focus);
}

function getWeeklyChartData(
  trainings: TrainingRecord[],
  kind: WeeklyGoalKind,
  today: string,
) {
  const currentWeek = weekStart(today);
  return Array.from({ length: 8 }, (_, index) => {
    const start = addDays(currentWeek, (index - 7) * 7);
    const end = addDays(start, 6);
    return {
      label: new Intl.DateTimeFormat("pl-PL", {
        day: "numeric",
        month: "short",
      }).format(new Date(`${start}T00:00:00Z`)),
      count: trainings.filter(
        (training) =>
          training.date >= start &&
          training.date <= end &&
          isMatchingTraining(training, kind),
      ).length,
    };
  });
}

function gradeLabel(value: number) {
  const scale = routeGradeOptions.map((grade) => ({
    grade,
    value: gradeValue(grade) ?? 0,
  }));
  return scale.reduce((nearest, item) =>
    Math.abs(item.value - value) < Math.abs(nearest.value - value)
      ? item
      : nearest,
  ).grade;
}

function getGradeChartData(ascents: AscentRecord[], today: string) {
  const maximums = new Map<string, number>();
  ascents
    .filter(
      (ascent) => ascent.date >= addDays(today, -60) && ascent.date <= today,
    )
    .forEach((ascent) => {
      const grade = gradeValue(ascent.subjectiveGrade || ascent.suggestedGrade);
      if (grade !== null)
        maximums.set(
          ascent.date,
          Math.max(maximums.get(ascent.date) ?? grade, grade),
        );
    });
  return [...maximums.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, grade]) => ({
      label: new Intl.DateTimeFormat("pl-PL", {
        day: "numeric",
        month: "short",
      }).format(new Date(`${date}T00:00:00Z`)),
      grade,
    }));
}

function WeeklyProgressChart({
  data,
  target,
}: {
  data: ReturnType<typeof getWeeklyChartData>;
  target: number;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 12, right: 8, bottom: 0, left: -20 }}
      >
        <CartesianGrid
          stroke="var(--component-chart-grid)"
          strokeDasharray="3 5"
        />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--component-chart-axis)", fontSize: 10 }}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "var(--component-chart-axis)", fontSize: 10 }}
        />
        <Tooltip
          contentStyle={{
            background: "var(--component-panel-bg)",
            border: "var(--component-panel-border)",
          }}
        />
        <ReferenceLine
          y={target}
          stroke="var(--accent)"
          strokeDasharray="5 4"
        />
        <Line
          dataKey="count"
          stroke="var(--component-chart-series-average)"
          strokeWidth={2}
          dot={{ fill: "var(--component-chart-series-average)", r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function GradeProgressChart({
  data,
  target,
}: {
  data: ReturnType<typeof getGradeChartData>;
  target: number;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 12, right: 8, bottom: 0, left: -20 }}
      >
        <CartesianGrid
          stroke="var(--component-chart-grid)"
          strokeDasharray="3 5"
        />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--component-chart-axis)", fontSize: 10 }}
        />
        <YAxis
          domain={["dataMin - 0.25", "dataMax + 0.25"]}
          tickFormatter={gradeLabel}
          tick={{ fill: "var(--component-chart-axis)", fontSize: 10 }}
          width={40}
        />
        <Tooltip
          contentStyle={{
            background: "var(--component-panel-bg)",
            border: "var(--component-panel-border)",
          }}
          formatter={(value) => gradeLabel(Number(value))}
        />
        <ReferenceLine
          y={target}
          stroke="var(--accent)"
          strokeDasharray="5 4"
        />
        <Line
          dataKey="grade"
          stroke="var(--component-chart-series-average)"
          strokeWidth={2}
          dot={{ fill: "var(--component-chart-series-average)", r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

type GoalsPanelWidgetProps = {
  embedded?: boolean;
  athleteId: string | null;
  goals: GoalRecord[];
  trainings: TrainingRecord[];
  ascents: AscentRecord[];
  weightEntries: WeightEntryRecord[];
  today: string;
  onCreateGoal: (
    input: Omit<GoalRecord, "id" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  onUpdateGoal: (
    input: Omit<GoalRecord, "createdAt" | "updatedAt">,
  ) => Promise<void>;
  onDeleteGoal: (goal: GoalRecord) => Promise<void>;
};

export function GoalsPanelWidget({
  embedded = false,
  athleteId,
  goals,
  trainings,
  ascents,
  today,
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal,
}: GoalsPanelWidgetProps) {
  const [drafts, setDrafts] = useState<Record<FixedGoalKind, GoalDraft>>(
    () =>
      Object.fromEntries(
        fixedGoalKinds.map((kind) => [kind, createDraft(kind)]),
      ) as Record<FixedGoalKind, GoalDraft>,
  );
  const [errors, setErrors] = useState<Record<FixedGoalKind, string>>({
    training_count: "",
    strength_coin: "",
    aerobic_coin: "",
    route_grade: "",
  });

  async function submit(
    kind: FixedGoalKind,
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const draft = drafts[kind];
    const targetValue = Number(draft.targetValue);
    if (
      !athleteId ||
      !Number.isFinite(targetValue) ||
      targetValue <= 0 ||
      (kind === "route_grade" && !draft.targetGrade)
    ) {
      setErrors((current) => ({
        ...current,
        [kind]:
          kind === "route_grade"
            ? "Wybierz docelową cyfrę."
            : "Podaj dodatnią liczbę treningów.",
      }));
      return;
    }
    setErrors((current) => ({ ...current, [kind]: "" }));
    const input = {
      athleteId,
      kind,
      title: draft.title,
      targetValue,
      targetGrade: kind === "route_grade" ? draft.targetGrade : undefined,
      startDate: today,
      status: "active",
    };
    try {
      const activeGoal = activeGoals.get(kind);
      if (activeGoal) {
        await onUpdateGoal({ ...input, id: activeGoal.id });
      } else {
        await onCreateGoal(input);
      }
    } catch {
      setErrors((current) => ({
        ...current,
        [kind]: "Nie udało się zapisać celu. Spróbuj ponownie.",
      }));
    }
  }

  const activeGoals = new Map(
    goals
      .filter(
        (goal): goal is GoalRecord & { kind: FixedGoalKind } =>
          goal.status === "active" &&
          fixedGoalKinds.includes(goal.kind as FixedGoalKind),
      )
      .map((goal) => [goal.kind, goal]),
  );

  return (
    <Panel
      gap="md"
      padding={embedded ? "none" : "panel"}
      className={embedded ? styles.embeddedPanel : undefined}
    >
      <div className={styles.heading}>
        <span className={styles.eyebrow}>Kierunek</span>
        <h2 className={styles.title}>Cele</h2>
      </div>
      <div className={styles.goalRows}>
        {fixedGoalKinds.map((kind) => {
          const draft = drafts[kind];
          const activeGoal = activeGoals.get(kind);
          const target =
            kind === "route_grade"
              ? (gradeValue(draft.targetGrade) ?? 0)
              : Number(draft.targetValue);
          const chart =
            kind === "route_grade" ? (
              <GradeProgressChart
                data={getGradeChartData(ascents, today)}
                target={target}
              />
            ) : (
              <WeeklyProgressChart
                data={getWeeklyChartData(trainings, kind, today)}
                target={target}
              />
            );
          return (
            <section className={styles.goalRow} key={kind}>
              <form
                className={styles.goalForm}
                onSubmit={(event) => void submit(kind, event)}
              >
                <div>
                  <span className={styles.goalLabel}>{goalLabels[kind]}</span>
                  <h3 className={styles.goalDescription}>
                    {goalDescriptions[kind]}
                  </h3>
                </div>
                {kind === "route_grade" ? (
                  <Select
                    className={styles.oldMoneyControl}
                    aria-label="Docelowa cyfra"
                    value={draft.targetGrade}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        route_grade: {
                          ...current.route_grade,
                          targetGrade: event.target.value,
                        },
                      }))
                    }
                  >
                    {routeGradeOptions.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <NumericStepperControl
                    className={styles.oldMoneyControl}
                    value={draft.targetValue}
                    inputSuffix="szt."
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [kind]: {
                          ...current[kind],
                          targetValue: event.target.value,
                        },
                      }))
                    }
                    onDecrement={() =>
                      setDrafts((current) => ({
                        ...current,
                        [kind]: {
                          ...current[kind],
                          targetValue: String(
                            Math.max(1, Number(current[kind].targetValue) - 1),
                          ),
                        },
                      }))
                    }
                    onIncrement={() =>
                      setDrafts((current) => ({
                        ...current,
                        [kind]: {
                          ...current[kind],
                          targetValue: String(
                            Math.min(10, Number(current[kind].targetValue) + 1),
                          ),
                        },
                      }))
                    }
                    decrementAriaLabel="Odejmij trening"
                    incrementAriaLabel="Dodaj trening"
                    inputProps={{
                      type: "number",
                      min: "1",
                      max: "10",
                      step: "1",
                    }}
                  />
                )}
                {errors[kind] ? (
                  <p className={formStyles.trainingSidebar__validationMessage}>
                    {errors[kind]}
                  </p>
                ) : null}
                <FormActions layout="inline">
                  <Button type="submit">
                    {activeGoal ? "Zapisz zmianę" : "Ustaw cel"}
                  </Button>
                  {activeGoal ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void onDeleteGoal(activeGoal)}
                    >
                      Wyzeruj
                    </Button>
                  ) : null}
                </FormActions>
              </form>
              <div className={styles.goalChart}>{chart}</div>
            </section>
          );
        })}
      </div>
    </Panel>
  );
}
