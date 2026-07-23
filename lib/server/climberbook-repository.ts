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
import { createTrainingExportMetadata } from "@/lib/climbs-db";
import {
  queryPostgres,
  withPostgresTransaction,
} from "@/lib/server/postgres";
import type { PoolClient } from "pg";
import { createHash } from "node:crypto";

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
  onboarding_completed: boolean;
  created_at: Date;
};

type SocialIdentityRow = {
  id: string;
  user_id: string;
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
  height_cm: number | string | null;
  weight_kg: number | string | null;
  updated_at: Date;
};

type WeightEntryRow = {
  id: number;
  athlete_id: string;
  date: string;
  time: string;
  weight_kg: number | string;
  created_at: Date;
};

function mapPostgresNumeric(value: number | string | null) {
  if (value === null) return null;

  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    throw new Error("Nieprawidłowa wartość numeryczna zwrócona przez PostgreSQL.");
  }

  return numericValue;
}

function mapRequiredPostgresNumeric(value: number | string) {
  const numericValue = mapPostgresNumeric(value);
  if (numericValue === null) {
    throw new Error("Wymagana wartość numeryczna PostgreSQL jest pusta.");
  }

  return numericValue;
}

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
  onboardingCompleted: boolean;
  createdAt: string;
};

function mapExperimentalUser(row: ExperimentalUserRow): ExperimentalUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    onboardingCompleted: row.onboarding_completed,
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
    heightCm: mapPostgresNumeric(row.height_cm),
    weightKg: mapPostgresNumeric(row.weight_kg),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapWeightEntry(row: WeightEntryRow): WeightEntryRecord {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    date: row.date,
    time: row.time,
    weightKg: mapRequiredPostgresNumeric(row.weight_kg),
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
      returning id, email, display_name, onboarding_completed, created_at
    `,
    [userId, input.email.trim().toLowerCase(), input.displayName.trim()],
  );

  return mapExperimentalUser(result.rows[0]);
}

export async function findOrCreateSocialUser(input: {
  provider: string;
  providerSubject: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  nick?: string;
}) {
  const existingIdentity = await queryPostgres<SocialIdentityRow>(
    `
      select id, user_id
      from auth_identities
      where provider = $1 and provider_subject = $2
    `,
    [input.provider, input.providerSubject],
  );
  const existingUserId = existingIdentity.rows[0]?.user_id;

  if (existingUserId) {
    const result = await queryPostgres<ExperimentalUserRow>(
      `
        update app_users
        set email = $2, display_name = $3
        where id = $1
        returning id, email, display_name, onboarding_completed, created_at
      `,
      [existingUserId, input.email.trim().toLowerCase(), input.displayName],
    );
    await withPostgresTransaction((client) =>
      ensureDefaultAthlete(client, existingUserId, input, input.email.trim().toLowerCase()),
    );
    return mapExperimentalUser(result.rows[0]);
  }

  return withPostgresTransaction(async (client) => {
    const identityId = crypto.randomUUID();
    const email = input.email.trim().toLowerCase();
    const matchingUsers = await client.query<ExperimentalUserRow>(
      `
        select id, email, display_name, onboarding_completed, created_at
        from app_users
        where lower(email) = $1
        limit 2
      `,
      [email],
    );
    const emailMatchedUser =
      matchingUsers.rows.length === 1 ? matchingUsers.rows[0] : null;

    if (emailMatchedUser) {
      await client.query(
        `
          insert into auth_identities (id, user_id, provider, provider_subject, email_at_login)
          values ($1, $2, $3, $4, $5)
        `,
        [
          identityId,
          emailMatchedUser.id,
          input.provider,
          input.providerSubject,
          email,
        ],
      );
      await ensureDefaultAthlete(client, emailMatchedUser.id, input, email);
      return mapExperimentalUser(emailMatchedUser);
    }

    const userId = crypto.randomUUID();
    const userResult = await client.query<ExperimentalUserRow>(
      `
        insert into app_users (id, email, display_name)
        values ($1, $2, $3)
        returning id, email, display_name, onboarding_completed, created_at
      `,
      [userId, email, input.displayName],
    );
    await client.query(
      `
        insert into auth_identities (id, user_id, provider, provider_subject, email_at_login)
        values ($1, $2, $3, $4, $5)
      `,
      [identityId, userId, input.provider, input.providerSubject, email],
    );
    await ensureDefaultAthlete(client, userId, input, email);

    return mapExperimentalUser(userResult.rows[0]);
  });
}

async function ensureDefaultAthlete(
  client: PoolClient,
  userId: string,
  input: Pick<
    Parameters<typeof findOrCreateSocialUser>[0],
    "firstName" | "lastName" | "nick"
  >,
  email: string,
) {
  const firstName = input.firstName?.trim() ?? "";
  const lastName = input.lastName?.trim() ?? "";
  const nick = input.nick?.trim() || email;
  const name = [firstName, lastName].filter(Boolean).join(" ") || nick;
  const athleteId = crypto.randomUUID();

  await client.query(
    `
      insert into athletes (
        id, source_id, name, first_name, last_name, nick, owner_user_id
      )
      select $1, $1, $2, $3, $4, $5, $6
      where not exists (
        select 1 from athletes where owner_user_id = $6
      )
    `,
    [athleteId, name, firstName, lastName, nick, userId],
  );
}

export async function listExperimentalUsers() {
  const result = await queryPostgres<ExperimentalUserRow>(`
    select id, email, display_name, onboarding_completed, created_at
    from app_users
    order by created_at asc
  `);

  return result.rows.map(mapExperimentalUser);
}

export async function requireExperimentalUser(userId: string) {
  const result = await queryPostgres<ExperimentalUserRow>(`
    select id, email, display_name, onboarding_completed, created_at
    from app_users
    where id = $1
  `, [userId]);

  const user = result.rows[0];

  if (!user) {
    throw new Error("Nie znaleziono użytkownika eksperymentalnego.");
  }

  return mapExperimentalUser(user);
}

export async function deleteExperimentalUser(userId: string) {
  const result = await queryPostgres<{ id: string }>(
    "delete from app_users where id = $1 returning id",
    [userId],
  );

  if (!result.rows[0]) {
    throw new Error("Nie znaleziono użytkownika eksperymentalnego.");
  }
}

export async function completeUserOnboarding(userId: string) {
  await queryPostgres(
    "update app_users set onboarding_completed = true where id = $1",
    [userId],
  );
}

export async function hasCompletedUserOnboarding(userId: string) {
  const result = await queryPostgres<{ onboarding_completed: boolean }>(
    "select onboarding_completed from app_users where id = $1",
    [userId],
  );
  return result.rows[0]?.onboarding_completed === true;
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

async function getOwnedSectionId(
  ownerUserId: string,
  sectionId: string | null | undefined,
) {
  if (!sectionId) return null;

  const result = await queryPostgres<{ id: string }>(`
    select id
    from sections
    where id = $1 and owner_user_id = $2
  `, [sectionId, ownerUserId]);

  if (!result.rows[0]) {
    throw new Error("Nie znaleziono sekcji należącej do użytkownika.");
  }

  return sectionId;
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

export async function exportPostgresDatabaseBackup(
  ownerUserId: string,
): Promise<ClimberbookFullDatabaseBackup> {
  const [ownerUser, snapshot] = await Promise.all([
    requireExperimentalUser(ownerUserId),
    getPostgresDatabaseSnapshot(ownerUserId),
  ]);
  const ownerAthlete = snapshot.athletes[0];

  if (!ownerAthlete) {
    throw new Error("Eksport pełnej bazy wymaga zawodnika właściciela.");
  }

  return {
    formatVersion: 3,
    exportedAt: new Date().toISOString(),
    ownerAthleteId: ownerAthlete.id,
    ownerEmail: ownerUser.email,
    ...createTrainingExportMetadata(snapshot.trainings),
    ...snapshot,
  };
}

export async function createAthleteInPostgres(
  ownerUserId: string,
  input: AthleteInput,
) {
  const athleteId = crypto.randomUUID();
  const sectionId = await getOwnedSectionId(ownerUserId, input.sectionId);
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
    sectionId,
    ownerUserId,
  ]);

  return mapAthlete(result.rows[0]);
}

export async function updateAthleteInPostgres(
  ownerUserId: string,
  athleteId: string,
  input: AthleteInput,
) {
  const sectionId = await getOwnedSectionId(ownerUserId, input.sectionId);
  const result = await queryPostgres<AthleteRow>(`
    update athletes
    set name = $3,
      first_name = $4,
      last_name = $5,
      nick = $6,
      section_id = $7
    where id = $1 and owner_user_id = $2
    returning id, source_id, name, first_name, last_name, nick, section_id, created_at
  `, [
    athleteId,
    ownerUserId,
    computeAthleteName(input),
    input.firstName?.trim() ?? "",
    input.lastName?.trim() ?? "",
    input.nick?.trim() ?? "",
    sectionId,
  ]);

  const athlete = result.rows[0];
  if (!athlete) throw new Error("Nie znaleziono zawodnika należącego do użytkownika.");

  return mapAthlete(athlete);
}

export async function deleteAthleteFromPostgres(
  ownerUserId: string,
  athleteId: string,
) {
  const result = await queryPostgres<{ id: string }>(`
    delete from athletes
    where id = $1 and owner_user_id = $2
    returning id
  `, [athleteId, ownerUserId]);

  if (!result.rows[0]) {
    throw new Error("Nie znaleziono zawodnika należącego do użytkownika.");
  }
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

export async function updateTrainingInPostgres(
  ownerUserId: string,
  input: Omit<TrainingRecord, "createdAt">,
) {
  await requireOwnedAthlete(ownerUserId, input.athleteId);
  const result = await queryPostgres<TrainingRow>(`
    update trainings
    set athlete_id = $2,
      date = $3,
      time = $4,
      duration_minutes = $5,
      age_years = $6,
      calories_burned = $7,
      attempts_count = $8,
      difficulty_notes = $9,
      difficulty_by_surface = $10,
      protocol = $11,
      wellbeing = $12,
      surfaces = $13,
      facility_name = $14,
      custom_session_type = $15,
      notes = $16
    where id = $1
      and exists (
        select 1
        from athletes
        where athletes.id = trainings.athlete_id
          and athletes.owner_user_id = $17
      )
    returning id, source_id, athlete_id, date, time, duration_minutes,
      age_years, calories_burned, attempts_count, difficulty_notes,
      difficulty_by_surface, protocol, wellbeing, surfaces, custom_session_type,
      facility_name, notes, created_at
  `, [
    input.id,
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
    ownerUserId,
  ]);

  const training = result.rows[0];
  if (!training) throw new Error("Nie znaleziono treningu należącego do użytkownika.");

  return mapTraining(training);
}

export async function deleteTrainingFromPostgres(
  ownerUserId: string,
  trainingId: string,
) {
  const result = await queryPostgres<{ id: string }>(`
    delete from trainings
    where id = $1
      and exists (
        select 1
        from athletes
        where athletes.id = trainings.athlete_id
          and athletes.owner_user_id = $2
      )
    returning id
  `, [trainingId, ownerUserId]);

  if (!result.rows[0]) {
    throw new Error("Nie znaleziono treningu należącego do użytkownika.");
  }
}

export async function listClimbsFromPostgres(
  ownerUserId: string,
  athleteId: string,
) {
  await requireOwnedAthlete(ownerUserId, athleteId);
  const result = await queryPostgres<ClimbRow>(`
    select id, athlete_id, name, grade, created_at
    from climbs
    where athlete_id = $1
    order by created_at asc
  `, [athleteId]);

  return result.rows.map(mapClimb);
}

export async function createClimbInPostgres(
  ownerUserId: string,
  input: Omit<ClimbRecord, "id" | "createdAt">,
) {
  await requireOwnedAthlete(ownerUserId, input.athleteId);
  const result = await queryPostgres<ClimbRow>(`
    insert into climbs (athlete_id, name, grade)
    values ($1, $2, $3)
    returning id, athlete_id, name, grade, created_at
  `, [input.athleteId, input.name.trim(), input.grade.trim()]);

  return mapClimb(result.rows[0]);
}

export async function updateClimbInPostgres(
  ownerUserId: string,
  input: Required<Pick<ClimbRecord, "id">> &
    Omit<ClimbRecord, "id" | "createdAt">,
) {
  const result = await queryPostgres<ClimbRow>(`
    update climbs
    set name = $2, grade = $3
    where id = $1
      and athlete_id = $4
      and exists (
        select 1
        from athletes
        where athletes.id = climbs.athlete_id
          and athletes.owner_user_id = $5
      )
    returning id, athlete_id, name, grade, created_at
  `, [input.id, input.name.trim(), input.grade.trim(), input.athleteId, ownerUserId]);

  const climb = result.rows[0];
  if (!climb) throw new Error("Nie znaleziono wspinaczki należącej do użytkownika.");

  return mapClimb(climb);
}

export async function deleteClimbFromPostgres(
  ownerUserId: string,
  climbId: number,
) {
  const result = await queryPostgres<{ id: number }>(`
    delete from climbs
    where id = $1
      and exists (
        select 1
        from athletes
        where athletes.id = climbs.athlete_id
          and athletes.owner_user_id = $2
      )
    returning id
  `, [climbId, ownerUserId]);

  if (!result.rows[0]) {
    throw new Error("Nie znaleziono wspinaczki należącej do użytkownika.");
  }
}

export async function getUserProfileFromPostgres(
  ownerUserId: string,
  athleteId: string,
) {
  await requireOwnedAthlete(ownerUserId, athleteId);
  const result = await queryPostgres<UserProfileRow>(`
    select key, athlete_id, birth_date, sex, height_cm, weight_kg, updated_at
    from user_profiles
    where athlete_id = $1
  `, [athleteId]);

  const profile = result.rows[0];

  return profile
    ? mapUserProfile(profile)
    : {
        key: `athlete:${athleteId}`,
        athleteId,
        birthDate: "",
        sex: "",
        heightCm: null,
        weightKg: null,
        updatedAt: "",
      };
}

export async function saveUserProfileToPostgres(
  ownerUserId: string,
  input: Omit<UserProfileRecord, "key" | "updatedAt">,
) {
  await requireOwnedAthlete(ownerUserId, input.athleteId);
  const result = await queryPostgres<UserProfileRow>(`
    insert into user_profiles (
      key, athlete_id, birth_date, sex, height_cm, weight_kg
    )
    values ($1, $2, $3, $4, $5, $6)
    on conflict (athlete_id) do update
    set birth_date = excluded.birth_date,
      sex = excluded.sex,
      height_cm = excluded.height_cm,
      weight_kg = excluded.weight_kg,
      updated_at = now()
    returning key, athlete_id, birth_date, sex, height_cm, weight_kg, updated_at
  `, [
    `athlete:${input.athleteId}`,
    input.athleteId,
    input.birthDate,
    input.sex,
    input.heightCm,
    input.weightKg,
  ]);

  return mapUserProfile(result.rows[0]);
}

export async function listWeightEntriesFromPostgres(
  ownerUserId: string,
  athleteId: string,
) {
  await requireOwnedAthlete(ownerUserId, athleteId);
  const result = await queryPostgres<WeightEntryRow>(`
    select id, athlete_id, date, time, weight_kg, created_at
    from weight_entries
    where athlete_id = $1
    order by date desc, time desc, created_at desc
  `, [athleteId]);

  return result.rows.map(mapWeightEntry);
}

export async function createWeightEntryInPostgres(
  ownerUserId: string,
  input: Omit<WeightEntryRecord, "id" | "createdAt">,
) {
  await requireOwnedAthlete(ownerUserId, input.athleteId);
  const result = await queryPostgres<WeightEntryRow>(`
    insert into weight_entries (athlete_id, date, time, weight_kg)
    values ($1, $2, $3, $4)
    returning id, athlete_id, date, time, weight_kg, created_at
  `, [input.athleteId, input.date, input.time, input.weightKg]);

  return mapWeightEntry(result.rows[0]);
}

export async function updateWeightEntryInPostgres(
  ownerUserId: string,
  input: Required<Pick<WeightEntryRecord, "id">> &
    Omit<WeightEntryRecord, "id" | "createdAt">,
) {
  const result = await queryPostgres<WeightEntryRow>(`
    update weight_entries
    set date = $2, time = $3, weight_kg = $4
    where id = $1
      and athlete_id = $5
      and exists (
        select 1
        from athletes
        where athletes.id = weight_entries.athlete_id
          and athletes.owner_user_id = $6
      )
    returning id, athlete_id, date, time, weight_kg, created_at
  `, [
    input.id,
    input.date,
    input.time,
    input.weightKg,
    input.athleteId,
    ownerUserId,
  ]);

  const entry = result.rows[0];

  if (!entry) {
    throw new Error("Nie znaleziono wpisu wagi należącego do użytkownika.");
  }

  return mapWeightEntry(entry);
}

export async function deleteWeightEntryFromPostgres(
  ownerUserId: string,
  entryId: number,
) {
  const result = await queryPostgres<{ id: number }>(`
    delete from weight_entries
    where id = $1
      and exists (
        select 1
        from athletes
        where athletes.id = weight_entries.athlete_id
          and athletes.owner_user_id = $2
      )
    returning id
  `, [entryId, ownerUserId]);

  if (!result.rows[0]) {
    throw new Error("Nie znaleziono wpisu wagi należącego do użytkownika.");
  }
}

export async function listAscentsFromPostgres(
  ownerUserId: string,
  athleteId: string,
) {
  await requireOwnedAthlete(ownerUserId, athleteId);
  const result = await queryPostgres<AscentRow>(`
    select id, athlete_id, date, source, import_source, route_name,
      suggested_grade, subjective_grade, style, notes, created_at
    from ascents
    where athlete_id = $1
    order by created_at desc
  `, [athleteId]);

  return result.rows.map(mapAscent);
}

export async function createAscentInPostgres(
  ownerUserId: string,
  input: Omit<AscentRecord, "id" | "createdAt">,
) {
  await requireOwnedAthlete(ownerUserId, input.athleteId);
  const result = await queryPostgres<AscentRow>(`
    insert into ascents (
      athlete_id, date, source, import_source, route_name, suggested_grade,
      subjective_grade, style, notes
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    returning id, athlete_id, date, source, import_source, route_name,
      suggested_grade, subjective_grade, style, notes, created_at
  `, [
    input.athleteId,
    input.date,
    input.source,
    input.importSource ?? null,
    input.routeName,
    input.suggestedGrade,
    input.subjectiveGrade,
    input.style ?? null,
    input.notes,
  ]);

  return mapAscent(result.rows[0]);
}

export async function updateAscentInPostgres(
  ownerUserId: string,
  input: Required<Pick<AscentRecord, "id">> &
    Omit<AscentRecord, "id" | "createdAt">,
) {
  const result = await queryPostgres<AscentRow>(`
    update ascents
    set date = $2,
      source = $3,
      import_source = $4,
      route_name = $5,
      suggested_grade = $6,
      subjective_grade = $7,
      style = $8,
      notes = $9
    where id = $1
      and athlete_id = $10
      and exists (
        select 1
        from athletes
        where athletes.id = ascents.athlete_id
          and athletes.owner_user_id = $11
      )
    returning id, athlete_id, date, source, import_source, route_name,
      suggested_grade, subjective_grade, style, notes, created_at
  `, [
    input.id,
    input.date,
    input.source,
    input.importSource ?? null,
    input.routeName,
    input.suggestedGrade,
    input.subjectiveGrade,
    input.style ?? null,
    input.notes,
    input.athleteId,
    ownerUserId,
  ]);

  const ascent = result.rows[0];

  if (!ascent) {
    throw new Error("Nie znaleziono przejścia należącego do użytkownika.");
  }

  return mapAscent(ascent);
}

export async function deleteAscentFromPostgres(
  ownerUserId: string,
  ascentId: number,
) {
  const result = await queryPostgres<{ id: number }>(`
    delete from ascents
    where id = $1
      and exists (
        select 1
        from athletes
        where athletes.id = ascents.athlete_id
          and athletes.owner_user_id = $2
      )
    returning id
  `, [ascentId, ownerUserId]);

  if (!result.rows[0]) {
    throw new Error("Nie znaleziono przejścia należącego do użytkownika.");
  }
}

export async function listSectionsFromPostgres(ownerUserId: string) {
  const result = await queryPostgres<SectionRow>(`
    select id, source_id, name, created_at
    from sections
    where owner_user_id = $1
    order by created_at asc
  `, [ownerUserId]);

  return result.rows.map(mapSection);
}

export async function createSectionInPostgres(ownerUserId: string, name: string) {
  const sectionId = crypto.randomUUID();
  const result = await queryPostgres<SectionRow>(`
    insert into sections (id, source_id, name, owner_user_id)
    values ($1, $1, $2, $3)
    returning id, source_id, name, created_at
  `, [sectionId, name.trim(), ownerUserId]);

  return mapSection(result.rows[0]);
}

export async function updateSectionInPostgres(
  ownerUserId: string,
  sectionId: string,
  name: string,
) {
  const result = await queryPostgres<SectionRow>(`
    update sections
    set name = $3
    where id = $1 and owner_user_id = $2
    returning id, source_id, name, created_at
  `, [sectionId, ownerUserId, name.trim()]);

  const section = result.rows[0];
  if (!section) throw new Error("Nie znaleziono sekcji należącej do użytkownika.");

  return mapSection(section);
}

export async function deleteSectionFromPostgres(
  ownerUserId: string,
  sectionId: string,
) {
  const result = await queryPostgres<{ id: string }>(`
    delete from sections
    where id = $1 and owner_user_id = $2
    returning id
  `, [sectionId, ownerUserId]);

  if (!result.rows[0]) {
    throw new Error("Nie znaleziono sekcji należącej do użytkownika.");
  }
}

export async function listFacilitiesFromPostgres(ownerUserId: string) {
  const result = await queryPostgres<FacilityRow>(`
    select id, name, created_at
    from facilities
    where owner_user_id = $1
    order by created_at asc
  `, [ownerUserId]);

  return result.rows.map(mapFacility);
}

export async function createFacilityInPostgres(
  ownerUserId: string,
  name: string,
) {
  const facilityId = crypto.randomUUID();
  const result = await queryPostgres<FacilityRow>(`
    insert into facilities (id, name, owner_user_id)
    values ($1, $2, $3)
    returning id, name, created_at
  `, [facilityId, name.trim(), ownerUserId]);

  return mapFacility(result.rows[0]);
}

export async function updateFacilityInPostgres(
  ownerUserId: string,
  facilityId: string,
  name: string,
) {
  const result = await queryPostgres<FacilityRow>(`
    update facilities
    set name = $3
    where id = $1 and owner_user_id = $2
    returning id, name, created_at
  `, [facilityId, ownerUserId, name.trim()]);

  const facility = result.rows[0];
  if (!facility) throw new Error("Nie znaleziono obiektu należącego do użytkownika.");

  return mapFacility(facility);
}

export async function deleteFacilityFromPostgres(
  ownerUserId: string,
  facilityId: string,
) {
  const result = await queryPostgres<{ id: string }>(`
    delete from facilities
    where id = $1 and owner_user_id = $2
    returning id
  `, [facilityId, ownerUserId]);

  if (!result.rows[0]) {
    throw new Error("Nie znaleziono obiektu należącego do użytkownika.");
  }
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

export class BackupOwnerEmailMismatchError extends Error {
  constructor() {
    super("E-mail właściciela backupu różni się od e-maila bieżącego konta.");
    this.name = "BackupOwnerEmailMismatchError";
  }
}

function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase();
}

function normalizeAthleteName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

function createOwnerScopedImportId(
  ownerUserId: string,
  recordType: string,
  sourceId: string | number,
) {
  const hash = createHash("sha256")
    .update(`${ownerUserId}:${recordType}:${sourceId}`)
    .digest("hex");

  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function getMappedAthleteId(
  athleteIds: Map<string, string>,
  sourceAthleteId: string | number,
) {
  const athleteId = athleteIds.get(String(sourceAthleteId));

  if (!athleteId) {
    throw new Error(
      `Brak zawodnika ${sourceAthleteId} wymaganego przez importowany rekord.`,
    );
  }

  return athleteId;
}

function getBackupAthleteName(athlete: Partial<AthleteRecord>) {
  const name = typeof athlete.name === "string" ? athlete.name.trim() : "";
  if (name) return name;

  const fullName = [athlete.firstName, athlete.lastName]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
  if (fullName) return fullName;

  const nick = typeof athlete.nick === "string" ? athlete.nick.trim() : "";
  return nick || "Zawodnik";
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
  allowDifferentOwnerEmail = false,
): Promise<BackupImportSummary> {
  if (!idempotencyKey.trim()) {
    throw new Error("Import wymaga klucza idempotencji.");
  }

  const currentUser = await requireExperimentalUser(ownerUserId);
  const backupOwnerEmail =
    typeof backup.ownerEmail === "string"
      ? normalizeEmail(backup.ownerEmail)
      : "";

  if (
    backupOwnerEmail &&
    backupOwnerEmail !== normalizeEmail(currentUser.email) &&
    !allowDifferentOwnerEmail
  ) {
    throw new BackupOwnerEmailMismatchError();
  }

  return withPostgresTransaction(async (client) => {
    const existingImport = await insertIdempotencyKey(client, idempotencyKey);

    if (existingImport) return existingImport;

    const sectionIds = new Map(
      backup.sections.map((section) => [
        String(section.id),
        createOwnerScopedImportId(
          ownerUserId,
          "section",
          section.sourceId ?? section.id,
        ),
      ]),
    );
    const athleteIds = new Map(
      backup.athletes.map((athlete) => [
        String(athlete.id),
        createOwnerScopedImportId(
          ownerUserId,
          "athlete",
          athlete.sourceId ?? athlete.id,
        ),
      ]),
    );
    const backupOwnerReference = backup.ownerAthleteId ?? "primary";
    const backupOwner = backup.athletes.find(
      (athlete) =>
        String(athlete.id) === backupOwnerReference ||
        athlete.sourceId === backupOwnerReference,
    );
    const currentAthletes = await client.query<{
      id: string;
      source_id: string | null;
      name: string;
    }>(
      `
        select id, source_id, name
        from athletes
        where owner_user_id = $1
        order by created_at asc
      `,
      [ownerUserId],
    );
    const emailMatchesCurrentUser =
      backupOwnerEmail === normalizeEmail(currentUser.email);
    const nameMatches = backupOwner
      ? currentAthletes.rows.filter(
          (athlete) =>
            typeof athlete.name === "string" &&
            normalizeAthleteName(athlete.name) ===
              normalizeAthleteName(getBackupAthleteName(backupOwner)),
        )
      : [];
    const matchingCurrentAthlete =
      currentAthletes.rows.find(
        (athlete) =>
          athlete.id === backupOwnerReference ||
          athlete.source_id === backupOwnerReference,
      ) ??
      (emailMatchesCurrentUser ? currentAthletes.rows[0] : undefined) ??
      (nameMatches.length === 1 ? nameMatches[0] : undefined) ??
      (backupOwnerReference === "primary" ? currentAthletes.rows[0] : undefined);

    if (backupOwner && matchingCurrentAthlete) {
      athleteIds.set(String(backupOwner.id), matchingCurrentAthlete.id);
    }

    for (const section of backup.sections) {
      const sectionId = sectionIds.get(String(section.id))!;

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
      const athleteId = athleteIds.get(String(athlete.id))!;
      const athleteName = getBackupAthleteName(athlete);
      const sectionId = athlete.sectionId
        ? sectionIds.get(String(athlete.sectionId)) ?? null
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
          athleteName,
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
      const facilityId = createOwnerScopedImportId(
        ownerUserId,
        "facility",
        facility.id,
      );

      await client.query(
        `
          insert into facilities (id, name, created_at, owner_user_id)
          values ($1, $2, $3, $4)
          on conflict (id) do update
          set name = excluded.name, created_at = excluded.created_at
        `,
        [facilityId, facility.name, facility.createdAt, ownerUserId],
      );
    }

    for (const training of backup.trainings) {
      const trainingId = createOwnerScopedImportId(
        ownerUserId,
        "training",
        training.sourceId ?? training.id,
      );

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
          select $1, $2, $3, $4, $5
          where not exists (
            select 1
            from weight_entries
            where athlete_id = $1
              and date = $2
              and time = $3
              and weight_kg = $4
              and created_at = $5
          )
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
          select $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
          where not exists (
            select 1
            from ascents
            where athlete_id = $1
              and date = $2
              and source = $3
              and import_source is not distinct from $4
              and route_name = $5
              and suggested_grade = $6
              and subjective_grade = $7
              and style is not distinct from $8
              and notes = $9
              and created_at = $10
          )
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
          select $1, $2, $3, $4
          where not exists (
            select 1
            from climbs
            where athlete_id = $1
              and name = $2
              and grade = $3
              and created_at = $4
          )
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