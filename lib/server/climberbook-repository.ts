import type { AthleteInput, AthleteRecord, TrainingRecord } from "@/lib/climbs-db";
import { queryPostgres } from "@/lib/server/postgres";

type AthleteRow = {
  id: string;
  source_id: string | null;
  name: string;
  first_name: string;
  last_name: string;
  nick: string;
  section_id: string | null;
  created_at: Date;
};

type TrainingRow = {
  id: string;
  source_id: string | null;
  athlete_id: string;
  date: string;
  time: string;
  duration_minutes: number;
  body_weight_kg: string;
  age_years: number;
  calories_burned: number;
  attempts_count: number;
  difficulty_notes: string;
  difficulty_by_surface: TrainingRecord["difficultyBySurface"] | null;
  protocol: TrainingRecord["protocol"] | null;
  wellbeing: string;
  surfaces: TrainingRecord["surfaces"];
  custom_session_type: string | null;
  notes: string;
  created_at: Date;
};

function computeAthleteName(input: AthleteInput) {
  const fullName = [input.firstName, input.lastName]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");

  return input.nick?.trim() || fullName || input.name?.trim() || "Zawodnik";
}

function mapAthlete(row: AthleteRow): AthleteRecord {
  return {
    id: row.id,
    sourceId: row.source_id ?? row.id,
    name: row.name,
    firstName: row.first_name,
    lastName: row.last_name,
    nick: row.nick,
    sectionId: row.section_id,
    createdAt: row.created_at.toISOString(),
  };
}

function mapTraining(row: TrainingRow): TrainingRecord {
  return {
    id: row.id,
    sourceId: row.source_id ?? row.id,
    athleteId: row.athlete_id,
    date: row.date,
    time: row.time,
    durationMinutes: row.duration_minutes,
    bodyWeightKg: Number(row.body_weight_kg),
    ageYears: row.age_years,
    caloriesBurned: row.calories_burned,
    attemptsCount: row.attempts_count,
    difficultyNotes: row.difficulty_notes,
    difficultyBySurface: row.difficulty_by_surface ?? undefined,
    protocol: row.protocol ?? undefined,
    wellbeing: row.wellbeing,
    surfaces: row.surfaces,
    customSessionType: row.custom_session_type ?? undefined,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
  };
}

export async function checkDatabase() {
  const result = await queryPostgres<{ ok: number }>("select 1 as ok");
  return result.rows[0]?.ok === 1;
}

export async function listAthletesFromPostgres() {
  const result = await queryPostgres<AthleteRow>(`
    select id, source_id, name, first_name, last_name, nick, section_id, created_at
    from athletes
    order by created_at asc
  `);

  return result.rows.map(mapAthlete);
}

export async function createAthleteInPostgres(input: AthleteInput) {
  const athleteId = crypto.randomUUID();
  const result = await queryPostgres<AthleteRow>(`
    insert into athletes (id, source_id, name, first_name, last_name, nick, section_id)
    values ($1, $1, $2, $3, $4, $5, $6)
    returning id, source_id, name, first_name, last_name, nick, section_id, created_at
  `, [
    athleteId,
    computeAthleteName(input),
    input.firstName?.trim() ?? "",
    input.lastName?.trim() ?? "",
    input.nick?.trim() ?? "",
    input.sectionId ?? null,
  ]);

  return mapAthlete(result.rows[0]);
}

export async function listTrainingsFromPostgres(athleteId?: string) {
  const result = await queryPostgres<TrainingRow>(`
    select id, source_id, athlete_id, date, time, duration_minutes, body_weight_kg,
      age_years, calories_burned, attempts_count, difficulty_notes,
      difficulty_by_surface, protocol, wellbeing, surfaces, custom_session_type,
      notes, created_at
    from trainings
    where ($1::uuid is null or athlete_id = $1::uuid)
    order by date desc, time desc, created_at desc
  `, [athleteId ?? null]);

  return result.rows.map(mapTraining);
}

export async function createTrainingInPostgres(
  input: Omit<TrainingRecord, "id" | "createdAt">,
) {
  const trainingId = crypto.randomUUID();
  const sourceId = input.sourceId ?? trainingId;
  const result = await queryPostgres<TrainingRow>(`
    insert into trainings (
      id, source_id, athlete_id, date, time, duration_minutes, body_weight_kg,
      age_years, calories_burned, attempts_count, difficulty_notes,
      difficulty_by_surface, protocol, wellbeing, surfaces, custom_session_type, notes
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    returning id, source_id, athlete_id, date, time, duration_minutes, body_weight_kg,
      age_years, calories_burned, attempts_count, difficulty_notes,
      difficulty_by_surface, protocol, wellbeing, surfaces, custom_session_type,
      notes, created_at
  `, [
    trainingId,
    sourceId,
    input.athleteId,
    input.date,
    input.time,
    input.durationMinutes,
    input.bodyWeightKg,
    input.ageYears,
    input.caloriesBurned,
    input.attemptsCount,
    input.difficultyNotes,
    input.difficultyBySurface ?? null,
    input.protocol ?? null,
    input.wellbeing,
    input.surfaces,
    input.customSessionType ?? null,
    input.notes,
  ]);

  return mapTraining(result.rows[0]);
}