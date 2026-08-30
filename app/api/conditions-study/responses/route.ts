import { NextResponse } from "next/server";
import { parseConditionsStudySubmission } from "@/lib/conditions-study";
import { queryPostgres } from "@/lib/server/postgres";

export const runtime = "nodejs";

type ConditionsStudyResponseRow = {
  scenario_version: number;
  scenario_source: "geo-weather" | "synthetic";
  temperature_c: number;
  humidity_percent: number;
  wind_kph: number;
  wind_category: "calm" | "breeze" | "gusts" | "strong" | "halny";
  score: number;
};

type ConditionsStudyResponseStatsRow = {
  total_count: number;
  average_score: number | null;
  score_stddev: number | null;
  low_score_count: number;
  medium_score_count: number;
  high_score_count: number;
  covered_scenario_buckets: number;
};

export async function GET() {
  try {
    const [result, statsResult] = await Promise.all([
      queryPostgres<ConditionsStudyResponseRow>(`
        select
          scenario_version, scenario_source,
          temperature_c, humidity_percent, wind_kph,
          wind_category, score
        from climbing_conditions_study_responses
        order by created_at desc, id desc
        limit 500
      `),
      queryPostgres<ConditionsStudyResponseStatsRow>(`
        with response_buckets as (
          select
            score,
            concat_ws(
              ':',
              case
                when temperature_c <= 5 then 'cold'
                when temperature_c <= 15 then 'cool'
                when temperature_c <= 25 then 'mild'
                else 'hot'
              end,
              case
                when humidity_percent <= 25 then 'very-dry'
                when humidity_percent <= 40 then 'dry'
                when humidity_percent <= 70 then 'normal'
                when humidity_percent <= 95 then 'humid'
                when humidity_percent <= 99 then 'very-humid'
                else 'saturated'
              end,
              wind_category
            ) as scenario_key
          from climbing_conditions_study_responses
        )
        select
          count(*)::int as total_count,
          avg(score)::float8 as average_score,
          stddev_pop(score)::float8 as score_stddev,
          count(*) filter (where score <= 30)::int as low_score_count,
          count(*) filter (where score between 31 and 70)::int as medium_score_count,
          count(*) filter (where score >= 71)::int as high_score_count,
          count(distinct scenario_key)::int as covered_scenario_buckets
        from response_buckets
      `),
    ]);
    const stats = statsResult.rows[0] ?? {
      total_count: 0,
      average_score: null,
      score_stddev: null,
      low_score_count: 0,
      medium_score_count: 0,
      high_score_count: 0,
      covered_scenario_buckets: 0,
    };

    return NextResponse.json({
      stats: {
        totalCount: stats.total_count,
        averageScore: stats.average_score,
        scoreStandardDeviation: stats.score_stddev,
        scoreBands: {
          low: stats.low_score_count,
          medium: stats.medium_score_count,
          high: stats.high_score_count,
        },
        coveredScenarioBuckets: stats.covered_scenario_buckets,
        totalScenarioBuckets: 120,
      },
      responses: result.rows.map((row) => ({
        score: row.score,
        scenario: {
          version: row.scenario_version,
          source: row.scenario_source,
          temperatureC: row.temperature_c,
          humidityPercent: row.humidity_percent,
          windKph: row.wind_kph,
          windCategory: row.wind_category,
        },
      })),
    });
  } catch (error) {
    console.error("Nie udało się pobrać odpowiedzi badania warunków.", error);
    return NextResponse.json(
      { error: "Nie udało się pobrać odpowiedzi." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Nieprawidłowy format danych." },
      { status: 400 },
    );
  }

  const submission = parseConditionsStudySubmission(input);
  if (!submission) {
    return NextResponse.json(
      { error: "Nieprawidłowe dane odpowiedzi." },
      { status: 400 },
    );
  }

  try {
    await queryPostgres(
      `
        insert into climbing_conditions_study_responses (
          respondent_id, scenario_version, scenario_source,
          temperature_c, humidity_percent, wind_kph,
          wind_category, score
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8
        )
      `,
      [
        submission.respondentId,
        submission.scenario.version,
        submission.scenario.source,
        submission.scenario.temperatureC,
        submission.scenario.humidityPercent,
        submission.scenario.windKph,
        submission.scenario.windCategory,
        submission.score,
      ],
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Nie udało się zapisać odpowiedzi badania warunków.", error);
    return NextResponse.json(
      { error: "Nie udało się zapisać odpowiedzi. Spróbuj ponownie." },
      { status: 500 },
    );
  }
}
