import type {
  AscentRecord,
  AthleteInput,
  AthleteRecord,
  ClimbRecord,
  ClimberbookFullDatabaseBackup,
  FacilityRecord,
  SectionRecord,
  TrainingRecord,
  UserProfileRecord,
  WeightEntryRecord,
} from "@/lib/climbs-db";
import {
  queryPostgres,
  withPostgresTransaction,
} from "@/lib/server/postgres";
import type { PoolClient } from "pg";

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

type ExperimentalUserRow = {
  id: string;
  email: string;
  display_name: string;
  created_at: Date;
};

type TrainingRow = {
  id: string;
  source_id: string | null;
  athlete_id: string;
  date: string;
  time: string;
  duration_minutes: number;
  age_years: number;
  calories_burned: number;
  attempts_count: number;
  difficulty_notes: string;
  difficulty_by_surface: TrainingRecord["difficultyBySurface"] | null;
  protocol: TrainingRecord["protocol"] | null;
  wellbeing: string;
  surfaces: TrainingRecord["surfaces"];
  facility_name: string | null;
  custom_session_type: string | null;
  notes: string;
  created_at: Date;
};

type SectionRow = {
  id: string;
  source_id: string | null;
  name: string;
  created_at: Date;
};

type FacilityRow = {
  id: string;
  name: string;
  created_at: Date;
};

type ClimbRow = {
  id: number;
  athlete_id: string;
  name: string;
  grade: string;
  created_at: Date;
};

type AscentRow = {
  id: number;
  athlete_id: string;
  date: string;
  source: AscentRecord["source"];
  import_source: AscentRecord["importSource"] | null;
  route_name: string;
  suggested_grade: string;
  subjective_grade: string;
  style: string | null;
  notes: string;
  created_at: Date;
};

type UserProfileRow = {
  key: string;
  athlete_id: string;
  birth_date: string;
  sex: UserProfileRecord["sex"];
  height_cm: number | null;
  weight_kg: number | null;
  updated_at: Date;
};

type WeightEntryRow = {
  id: number;
  athlete_id: string;
  date: string;
  time: string;
  weight_kg: number;
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

export type ExperimentalUser = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
};

function mapExperimentalUser(row: ExperimentalUserRow): ExperimentalUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
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
    ageYears: row.age_years,
    caloriesBurned: row.calories_burned,
    attemptsCount: row.attempts_count,
    difficultyNotes: row.difficulty_notes,
    difficultyBySurface: row.difficulty_by_surface ?? undefined,
    protocol: row.protocol ?? undefined,
    wellbeing: row.wellbeing,
    surfaces: row.surfaces,
    facilityName: row.facility_name ?? undefined,
    customSessionType: row.custom_session_type ?? undefined,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
  };
}

function mapSection(row: SectionRow): SectionRecord {
  return {
    id: row.id,
    sourceId: row.source_id ?? row.id,
    name: row.name,
    createdAt: row.created_at.toISOString(),
  };
}

function mapFacility(row: FacilityRow): FacilityRecord {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at.toISOString(),
  };
}

function mapClimb(row: ClimbRow): ClimbRecord {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    name: row.name,
    grade: row.grade,
    createdAt: row.created_at.toISOString(),
  };
}

function mapAscent(row: AscentRow): AscentRecord {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    date: row.date,
    source: row.source,
    importSource: row.import_source ?? undefined,
    routeName: row.route_name,
    suggestedGrade: row.suggested_grade,
    subjectiveGrade: row.subjective_grade,
    style: row.style ?? undefined,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
  };
}

function mapUserProfile(row: UserProfileRow): UserProfileRecord {
  return {
    key: row.key,
    athleteId: row.athlete_id,
    birthDate: row.birth_date,
    sex: row.sex,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapWeightEntry(row: WeightEntryRow): WeightEntryRecord {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    date: row.date,
    time: row.time,
    weightKg: row.weight_kg,
    createdAt: row.created_at.toISOString(),
  };
}

export type PostgresDatabaseSnapshot = {
  athletes: AthleteRecord[];
  sections: SectionRecord[];
  facilities: FacilityRecord[];
  climbs: ClimbRecord[];
  trainings: TrainingRecord[];
  ascents: AscentRecord[];
  profiles: UserProfileRecord[];
  weightEntries: WeightEntryRecord[];
};

export async function checkDatabase() {
  const result = await queryPostgres<{ ok: number }>("select 1 as ok");
  return result.rows[0]?.ok === 1;
}

export async function createExperimentalUser(input: {
  email: string;
  displayName: string;
}) {
  const userId = crypto.randomUUID();
  const result = await queryPostgres<ExperimentalUserRow>(
    `
      insert into app_users (id, email, display_name)
      values ($1, $2, $3)
      returning id, email, display_name, created_at
    `,
    [userId, input.email.trim().toLowerCase(), input.displayName.trim()],
  );

  return mapExperimentalUser(result.rows[0]);
}

export async function listExperimentalUsers() {
  const result = await queryPostgres<ExperimentalUserRow>(`
    select id, email, display_name, created_at
    from app_users
    order by created_at asc
  `);

  return result.rows.map(mapExperimentalUser);
}

export async function requireExperimentalUser(userId: string) {
  const result = await queryPostgres<ExperimentalUserRow>(`
    select id, email, display_name, created_at
    from app_users
    where id = $1
  `, [userId]);

  const user = result.rows[0];

  if (!user) {
    throw new Error("Nie znaleziono użytkownika eksperymentalnego.");
  }

  return mapExperimentalUser(user);
}

async function requireOwnedAthlete(ownerUserId: string, athleteId: string) {
  const result = await queryPostgres<{ id: string }>(`
    select id
    from athletes
    where id = $1 and owner_user_id = $2
  `, [athleteId, ownerUserId]);

  if (!result.rows[0]) {
    throw new Error("Nie znaleziono zawodnika należącego do użytkownika.");
  }
}

export async function listAthletesFromPostgres(ownerUserId: string) {
  const result = await queryPostgres<AthleteRow>(`
    select id, source_id, name, first_name, last_name, nick, section_id, created_at
    from athletes
    where owner_user_id = $1
    order by created_at asc
  `, [ownerUserId]);

  return result.rows.map(mapAthlete);
}

export async function getPostgresDatabaseSnapshot(
  ownerUserId: string,
): Promise<PostgresDatabaseSnapshot> {
  const [
    athletes,
    sections,
    facilities,
    climbs,
    trainings,
    ascents,
    profiles,
    weightEntries,
  ] = await Promise.all([
    listAthletesFromPostgres(ownerUserId),
    queryPostgres<SectionRow>(
      "select id, source_id, name, created_at from sections where owner_user_id = $1 order by created_at asc",
      [ownerUserId],
    ),
    queryPostgres<FacilityRow>(
      "select id, name, created_at from facilities where owner_user_id = $1 order by created_at asc",
      [ownerUserId],
    ),
    queryPostgres<ClimbRow>(`
      select climbs.id, climbs.athlete_id, climbs.name, climbs.grade, climbs.created_at
      from climbs
      join athletes on athletes.id = climbs.athlete_id
      where athletes.owner_user_id = $1
      order by climbs.created_at asc
    `, [ownerUserId]),
    listTrainingsFromPostgres(ownerUserId),
    queryPostgres<AscentRow>(`
      select ascents.id, ascents.athlete_id, ascents.date, ascents.source,
        ascents.import_source, ascents.route_name, ascents.suggested_grade,
        ascents.subjective_grade, ascents.style, ascents.notes, ascents.created_at
      from ascents
      join athletes on athletes.id = ascents.athlete_id
      where athletes.owner_user_id = $1
      order by ascents.created_at desc
    `, [ownerUserId]),
    queryPostgres<UserProfileRow>(`
      select user_profiles.key, user_profiles.athlete_id, user_profiles.birth_date,
        user_profiles.sex, user_profiles.height_cm, user_profiles.weight_kg,
        user_profiles.updated_at
      from user_profiles
      join athletes on athletes.id = user_profiles.athlete_id
      where athletes.owner_user_id = $1
      order by user_profiles.updated_at desc
    `, [ownerUserId]),
    queryPostgres<WeightEntryRow>(`
      select weight_entries.id, weight_entries.athlete_id, weight_entries.date,
        weight_entries.time, weight_entries.weight_kg, weight_entries.created_at
      from weight_entries
      join athletes on athletes.id = weight_entries.athlete_id
      where athletes.owner_user_id = $1
      order by weight_entries.created_at desc
    `, [ownerUserId]),
  ]);

  return {
    athletes,
    sections: sections.rows.map(mapSection),
    facilities: facilities.rows.map(mapFacility),
    climbs: climbs.rows.map(mapClimb),
    trainings,
    ascents: ascents.rows.map(mapAscent),
    profiles: profiles.rows.map(mapUserProfile),
    weightEntries: weightEntries.rows.map(mapWeightEntry),
  };
}

export async function createAthleteInPostgres(
  ownerUserId: string,
  input: AthleteInput,
) {
  const athleteId = crypto.randomUUID();
  const result = await queryPostgres<AthleteRow>(`
    insert into athletes (
      id, source_id, name, first_name, last_name, nick, section_id, owner_user_id
    )
    values ($1, $1, $2, $3, $4, $5, $6, $7)
    returning id, source_id, name, first_name, last_name, nick, section_id, created_at
  `, [
    athleteId,
    computeAthleteName(input),
    input.firstName?.trim() ?? "",
    input.lastName?.trim() ?? "",
    input.nick?.trim() ?? "",
    input.sectionId ?? null,
    ownerUserId,
  ]);

  return mapAthlete(result.rows[0]);
}

export async function listTrainingsFromPostgres(
  ownerUserId: string,
  athleteId?: string,
) {
  const result = await queryPostgres<TrainingRow>(`
    select trainings.id, trainings.source_id, trainings.athlete_id,
      trainings.date, trainings.time, trainings.duration_minutes,
      trainings.age_years, trainings.calories_burned, trainings.attempts_count,
      trainings.difficulty_notes, trainings.difficulty_by_surface,
      trainings.protocol, trainings.wellbeing, trainings.surfaces,
      trainings.custom_session_type, trainings.facility_name, trainings.notes,
      trainings.created_at
    from trainings
    join athletes on athletes.id = trainings.athlete_id
    where athletes.owner_user_id = $1
      and ($2::uuid is null or trainings.athlete_id = $2::uuid)
    order by trainings.date desc, trainings.time desc, trainings.created_at desc
  `, [ownerUserId, athleteId ?? null]);

  return result.rows.map(mapTraining);
}

export async function createTrainingInPostgres(
  ownerUserId: string,
  input: Omit<TrainingRecord, "id" | "createdAt">,
) {
  await requireOwnedAthlete(ownerUserId, input.athleteId);

  const trainingId = crypto.randomUUID();
  const sourceId = input.sourceId ?? trainingId;
  const result = await queryPostgres<TrainingRow>(`
    insert into trainings (
      id, source_id, athlete_id, date, time, duration_minutes,
      age_years, calories_burned, attempts_count, difficulty_notes,
      difficulty_by_surface, protocol, wellbeing, surfaces, facility_name,
      custom_session_type, notes
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    returning id, source_id, athlete_id, date, time, duration_minutes,
      age_years, calories_burned, attempts_count, difficulty_notes,
      difficulty_by_surface, protocol, wellbeing, surfaces, custom_session_type,
      facility_name, notes, created_at
  `, [
    trainingId,
    sourceId,
    input.athleteId,
    input.date,
    input.time,
    input.durationMinutes,
    input.ageYears,
    input.caloriesBurned,
    input.attemptsCount,
    input.difficultyNotes,
    input.difficultyBySurface ?? null,
    input.protocol ?? null,
    input.wellbeing,
    input.surfaces,
    input.facilityName ?? null,
    input.customSessionType ?? null,
    input.notes,
  ]);

  return mapTraining(result.rows[0]);
}

type BackupImportSummary = {
  imported: {
    athletes: number;
    sections: number;
    facilities: number;
    climbs: number;
    trainings: number;
    ascents: number;
    profiles: number;
    weightEntries: number;
  };
};

function isUuid(value: string | null | undefined): value is string {
  return Boolean(
    value?.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    ),
  );
}

function getBackupSourceId(record: { id: string; sourceId?: string }) {
  const sourceId = record.sourceId ?? record.id;

  if (!isUuid(sourceId)) {
    throw new Error(
      `Rekord ${record.id} nie ma poprawnego UUID sourceId wymagnego przez PostgreSQL.`,
    );
  }

  return sourceId;
}

function getMappedAthleteId(
  athleteIds: Map<string, string>,
  sourceAthleteId: string,
) {
  const athleteId = athleteIds.get(sourceAthleteId);

  if (!athleteId) {
    throw new Error(
      `Brak zawodnika ${sourceAthleteId} wymaganego przez importowany rekord.`,
    );
  }

  return athleteId;
}

async function insertIdempotencyKey(
  client: PoolClient,
  idempotencyKey: string,
) {
  const result = await client.query<{ response: BackupImportSummary }>(
    `
      insert into idempotency_keys (key, operation, response)
      values ($1, 'full-backup-import', $2::jsonb)
      on conflict (key) do nothing
      returning response
    `,
    [idempotencyKey, JSON.stringify({ status: "pending" })],
  );

  if (result.rowCount) return null;

  const existing = await client.query<{ response: BackupImportSummary }>(
    "select response from idempotency_keys where key = $1",
    [idempotencyKey],
  );

  return existing.rows[0]?.response ?? null;
}

export async function importFullBackupToPostgres(
  backup: ClimberbookFullDatabaseBackup,
  idempotencyKey: string,
  ownerUserId: string,
): Promise<BackupImportSummary> {
  if (!idempotencyKey.trim()) {
    throw new Error("Import wymaga klucza idempotencji.");
  }

  await requireExperimentalUser(ownerUserId);

  return withPostgresTransaction(async (client) => {
    const existingImport = await insertIdempotencyKey(client, idempotencyKey);

    if (existingImport) return existingImport;

    const sectionIds = new Map(
      backup.sections.map((section) => [section.id, getBackupSourceId(section)]),
    );
    const athleteIds = new Map(
      backup.athletes.map((athlete) => [athlete.id, getBackupSourceId(athlete)]),
    );

    for (const section of backup.sections) {
      const sectionId = getBackupSourceId(section);

      await client.query(
        `
          insert into sections (id, source_id, name, created_at, owner_user_id)
          values ($1, $1, $2, $3, $4)
          on conflict (id) do update
          set name = excluded.name, created_at = excluded.created_at
        `,
        [sectionId, section.name, section.createdAt, ownerUserId],
      );
    }

    for (const athlete of backup.athletes) {
      const athleteId = getBackupSourceId(athlete);
      const sectionId = athlete.sectionId
        ? sectionIds.get(athlete.sectionId) ?? null
        : null;

      await client.query(
        `
          insert into athletes (
            id, source_id, name, first_name, last_name, nick, section_id, created_at,
            owner_user_id
          )
          values ($1, $1, $2, $3, $4, $5, $6, $7, $8)
          on conflict (id) do update
          set name = excluded.name,
            first_name = excluded.first_name,
            last_name = excluded.last_name,
            nick = excluded.nick,
            section_id = excluded.section_id,
            created_at = excluded.created_at
        `,
        [
          athleteId,
          athlete.name,
          athlete.firstName ?? "",
          athlete.lastName ?? "",
          athlete.nick ?? "",
          sectionId,
          athlete.createdAt,
          ownerUserId,
        ],
      );
    }

    for (const facility of backup.facilities) {
      if (!isUuid(facility.id)) {
        throw new Error(`Obiekt ${facility.name} nie ma poprawnego UUID.`);
      }

      await client.query(
        `
          insert into facilities (id, name, created_at, owner_user_id)
          values ($1, $2, $3, $4)
          on conflict (id) do update
          set name = excluded.name, created_at = excluded.created_at
        `,
        [facility.id, facility.name, facility.createdAt, ownerUserId],
      );
    }

    for (const training of backup.trainings) {
      const trainingId = getBackupSourceId(training);

      await client.query(
        `
          insert into trainings (
            id, source_id, athlete_id, date, time, duration_minutes,
            age_years, calories_burned, attempts_count, difficulty_notes,
            difficulty_by_surface, protocol, wellbeing, surfaces, facility_name,
            custom_session_type, notes, created_at
          )
          values (
            $1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
            $15, $16, $17
          )
          on conflict (id) do update
          set athlete_id = excluded.athlete_id,
            date = excluded.date,
            time = excluded.time,
            duration_minutes = excluded.duration_minutes,
            age_years = excluded.age_years,
            calories_burned = excluded.calories_burned,
            attempts_count = excluded.attempts_count,
            difficulty_notes = excluded.difficulty_notes,
            difficulty_by_surface = excluded.difficulty_by_surface,
            protocol = excluded.protocol,
            wellbeing = excluded.wellbeing,
            surfaces = excluded.surfaces,
            facility_name = excluded.facility_name,
            custom_session_type = excluded.custom_session_type,
            notes = excluded.notes,
            created_at = excluded.created_at
        `,
        [
          trainingId,
          getMappedAthleteId(athleteIds, training.athleteId),
          training.date,
          training.time,
          training.durationMinutes,
          training.ageYears,
          training.caloriesBurned,
          0,
          training.difficultyNotes,
          training.difficultyBySurface ?? null,
          training.protocol ?? null,
          training.wellbeing,
          training.surfaces,
          training.facilityName ?? null,
          training.customSessionType ?? null,
          training.notes,
          training.createdAt,
        ],
      );
    }

    for (const profile of backup.profiles) {
      const athleteId = getMappedAthleteId(athleteIds, profile.athleteId);

      await client.query(
        `
          insert into user_profiles (
            key, athlete_id, birth_date, sex, height_cm, weight_kg, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7)
          on conflict (athlete_id) do update
          set birth_date = excluded.birth_date,
            sex = excluded.sex,
            height_cm = excluded.height_cm,
            weight_kg = excluded.weight_kg,
            updated_at = excluded.updated_at
        `,
        [
          `athlete:${athleteId}`,
          athleteId,
          profile.birthDate,
          profile.sex,
          profile.heightCm,
          profile.weightKg,
          profile.updatedAt,
        ],
      );
    }

    for (const entry of backup.weightEntries) {
      await client.query(
        `
          insert into weight_entries (athlete_id, date, time, weight_kg, created_at)
          values ($1, $2, $3, $4, $5)
        `,
        [
          getMappedAthleteId(athleteIds, entry.athleteId),
          entry.date,
          entry.time,
          entry.weightKg,
          entry.createdAt,
        ],
      );
    }

    for (const ascent of backup.ascents) {
      await client.query(
        `
          insert into ascents (
            athlete_id, date, source, import_source, route_name, suggested_grade,
            subjective_grade, style, notes, created_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          getMappedAthleteId(athleteIds, ascent.athleteId),
          ascent.date,
          ascent.source,
          ascent.importSource ?? null,
          ascent.routeName,
          ascent.suggestedGrade,
          ascent.subjectiveGrade,
          ascent.style ?? null,
          ascent.notes,
          ascent.createdAt,
        ],
      );
    }

    for (const climb of backup.climbs) {
      await client.query(
        `
          insert into climbs (athlete_id, name, grade, created_at)
          values ($1, $2, $3, $4)
        `,
        [
          getMappedAthleteId(athleteIds, climb.athleteId),
          climb.name,
          climb.grade,
          climb.createdAt,
        ],
      );
    }

    const summary: BackupImportSummary = {
      imported: {
        athletes: backup.athletes.length,
        sections: backup.sections.length,
        facilities: backup.facilities.length,
        climbs: backup.climbs.length,
        trainings: backup.trainings.length,
        ascents: backup.ascents.length,
        profiles: backup.profiles.length,
        weightEntries: backup.weightEntries.length,
      },
    };

    await client.query(
      "update idempotency_keys set response = $2::jsonb where key = $1",
      [idempotencyKey, JSON.stringify(summary)],
    );

    return summary;
  });
}