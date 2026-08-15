import type {
  AscentRecord,
  AgentActionRecord,
  AgentFeedItemRecord,
  AthleteInput,
  AthleteRecord,
  ClimbRecord,
  ClimberbookFullDatabaseBackup,
  FacilityRecord,
  GoalRecord,
  PublicTrainingShare,
  SectionRecord,
  TrainingRecord,
  TrainingSummaryRecord,
  TrainingSummaryScope,
  UserProfileRecord,
  WeightEntryRecord,
} from "@/lib/climbs-db";
import { createTrainingExportMetadata } from "@/lib/climbs-db";
import {
  getTrainingStimulusImpact,
  getTrainingStimulusScale,
} from "@/components/climberbook/modules/analytics/components/TrainingLoadModel";
import {
  getObjectiveStimulusActivities,
  getStimulusCatalog,
} from "@/lib/training-stimulus";
import { queryPostgres, withPostgresTransaction } from "@/lib/server/postgres";
import { hashPassword, verifyPassword } from "@/lib/server/passwords";
import type { PoolClient } from "pg";
import { createHash, randomBytes } from "node:crypto";

type AthleteRow = {
  id: string;
  source_id: string | null;
  name: string;
  first_name: string;
  last_name: string;
  nick: string;
  email: string | null;
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

type PasswordCredentialRow = {
  password_hash: string;
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
  load_profile: TrainingRecord["loadProfile"] | null;
  wellbeing: string;
  surfaces: TrainingRecord["surfaces"];
  facility_name: string | null;
  facility_id: string | null;
  facility_version: number | null;
  weather_snapshot: TrainingRecord["weatherSnapshot"] | null;
  rope_wall_name: string | null;
  rope_routes: TrainingRecord["ropeRoutes"] | null;
  custom_session_type: string | null;
  notes: string;
  created_at: Date;
};

type SectionRow = {
  id: string;
  source_id: string | null;
  name: string;
  facility_id: string | null;
  created_at: Date;
};

type FacilityRow = {
  id: string;
  current_version: number;
  name: string;
  capabilities: FacilityRecord["capabilities"] | null;
  visibility: FacilityRecord["visibility"];
  created_by: string;
  is_owned_by_current_user: boolean;
  kind: FacilityRecord["kind"];
  location_label: string | null;
  latitude: number | null;
  longitude: number | null;
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
  discipline: AscentRecord["discipline"] | null;
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

type GoalRow = {
  id: string;
  athlete_id: string;
  kind: GoalRecord["kind"];
  title: string;
  target_value: number | string;
  target_grade: string | null;
  start_date: string;
  end_date: string | null;
  status: GoalRecord["status"];
  created_at: Date;
  updated_at: Date;
};

type TrainingSummaryRow = {
  id: string;
  scope: TrainingSummaryScope;
  period_start: string;
  period_end: string;
  training_id: string | null;
  content: TrainingSummaryRecord["content"];
  created_at: Date;
  updated_at: Date;
};

type AgentActionRow = {
  id: string;
  kind: AgentActionRecord["kind"];
  status: AgentActionRecord["status"];
  title: string;
  details: Record<string, unknown>;
  created_at: Date;
  completed_at: Date | null;
};

type AgentFeedItemRow = {
  id: string;
  kind: AgentFeedItemRecord["kind"];
  title: string;
  body: string;
  training_id: string | null;
  published_at: Date;
};

function mapPostgresNumeric(value: number | string | null) {
  if (value === null) return null;

  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    throw new Error(
      "Nieprawidłowa wartość numeryczna zwrócona przez PostgreSQL.",
    );
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

function mapRopeRoutes(value: TrainingRow["rope_routes"]) {
  if (!value) return undefined;

  const routes =
    typeof value === "string" ? (JSON.parse(value) as unknown) : value;
  if (!Array.isArray(routes)) return undefined;

  return routes.filter(
    (route): route is NonNullable<TrainingRecord["ropeRoutes"]>[number] =>
      typeof route === "object" &&
      route !== null &&
      typeof route.grade === "string" &&
      typeof route.ropeWallName === "string" &&
      typeof route.completed === "number",
  );
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
    email: row.email ?? undefined,
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
    loadProfile: row.load_profile ?? undefined,
    wellbeing: row.wellbeing,
    surfaces: row.surfaces,
    facilityName: row.facility_name ?? undefined,
    facilityId: row.facility_id ?? undefined,
    facilityVersion: row.facility_version ?? undefined,
    weatherSnapshot: row.weather_snapshot ?? undefined,
    ropeWallName: row.rope_wall_name ?? undefined,
    ropeRoutes: mapRopeRoutes(row.rope_routes),
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
    facilityId: row.facility_id,
    createdAt: row.created_at.toISOString(),
  };
}

function mapFacility(row: FacilityRow): FacilityRecord {
  const capabilities = row.capabilities ?? { activities: [], ropeWalls: [] };
  return {
    id: row.id,
    currentVersion: row.current_version,
    name: row.name,
    visibility: row.visibility,
    createdBy: row.created_by,
    isOwnedByCurrentUser: row.is_owned_by_current_user,
    kind: row.kind,
    locationLabel: row.location_label ?? "",
    latitude: row.latitude,
    longitude: row.longitude,
    capabilities: {
      ...capabilities,
      ropeWalls: capabilities.ropeWalls.map((wall, index) => ({
        ...wall,
        name: wall.name?.trim() || `Ściana ${index + 1}`,
      })),
    },
    createdAt: row.created_at.toISOString(),
  };
}

function mapTrainingSummary(row: TrainingSummaryRow): TrainingSummaryRecord {
  return {
    id: row.id,
    scope: row.scope,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    trainingId: row.training_id ?? undefined,
    content: row.content,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapAgentAction(row: AgentActionRow): AgentActionRecord {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    title: row.title,
    details: row.details,
    createdAt: row.created_at.toISOString(),
    completedAt: row.completed_at?.toISOString(),
  };
}

function mapAgentFeedItem(row: AgentFeedItemRow): AgentFeedItemRecord {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    trainingId: row.training_id ?? undefined,
    publishedAt: row.published_at.toISOString(),
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
    id: Number(row.id),
    athleteId: row.athlete_id,
    date: row.date,
    source: row.source,
    discipline: row.discipline ?? undefined,
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

function mapGoal(row: GoalRow): GoalRecord {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    kind: row.kind,
    title: row.title,
    targetValue: mapRequiredPostgresNumeric(row.target_value),
    targetGrade: row.target_grade ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
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
  goals: GoalRecord[];
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

export async function getOrCreateLocalDevelopmentUserId() {
  const result = await queryPostgres<ExperimentalUserRow>(
    `
      insert into app_users (id, email, display_name)
      values ($1, 'local@climberbook.test', 'Local Climberbook')
      on conflict (email) do update
      set display_name = app_users.display_name
      returning id, email, display_name, onboarding_completed, created_at
    `,
    [crypto.randomUUID()],
  );

  return result.rows[0].id;
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
      ensureDefaultAthlete(
        client,
        existingUserId,
        input,
        input.email.trim().toLowerCase(),
      ),
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

export class EmailPasswordRegistrationError extends Error {}

export async function registerEmailPasswordUser(input: {
  email: string;
  password: string;
  displayName: string;
}) {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);

  return withPostgresTransaction(async (client) => {
    const existingUsers = await client.query<ExperimentalUserRow>(
      `
        select id, email, display_name, onboarding_completed, created_at
        from app_users
        where lower(email) = $1
        limit 2
      `,
      [email],
    );
    const existingUser =
      existingUsers.rows.length === 1 ? existingUsers.rows[0] : null;

    if (existingUser) {
      throw new EmailPasswordRegistrationError(
        "Konto z tym adresem e-mail już istnieje. Zaloguj się istniejącą metodą.",
      );
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
      "insert into auth_password_credentials (user_id, password_hash) values ($1, $2)",
      [userId, passwordHash],
    );
    await ensureDefaultAthlete(
      client,
      userId,
      { nick: input.displayName },
      email,
    );

    return mapExperimentalUser(userResult.rows[0]);
  });
}

export async function authenticateEmailPasswordUser(
  emailInput: string,
  password: string,
) {
  const email = emailInput.trim().toLowerCase();
  const result = await queryPostgres<
    ExperimentalUserRow & PasswordCredentialRow
  >(
    `
      select app_users.id, app_users.email, app_users.display_name,
        app_users.onboarding_completed, app_users.created_at,
        auth_password_credentials.user_id, auth_password_credentials.password_hash
      from app_users
      join auth_password_credentials on auth_password_credentials.user_id = app_users.id
      where lower(app_users.email) = $1
    `,
    [email],
  );
  const user = result.rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash)))
    return null;

  return mapExperimentalUser(user);
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
      update athletes
      set name = case when btrim(name) = '' or name = 'Zawodnik' then $1 else name end,
        first_name = case when btrim(first_name) = '' then $2 else first_name end,
        last_name = case when btrim(last_name) = '' then $3 else last_name end,
        nick = case when btrim(nick) = '' then $4 else nick end,
        email = case when email is null or btrim(email) = '' then $5 else email end
      where id = (
        select id from athletes
        where owner_user_id = $6
        order by created_at asc
        limit 1
      )
    `,
    [name, firstName, lastName, nick, email, userId],
  );

  await client.query(
    `
      insert into athletes (
        id, source_id, name, first_name, last_name, nick, email, owner_user_id
      )
      select $1, $1, $2, $3, $4, $5, $6, $7
      where not exists (
        select 1 from athletes where owner_user_id = $7
      )
    `,
    [athleteId, name, firstName, lastName, nick, email, userId],
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
  const result = await queryPostgres<ExperimentalUserRow>(
    `
    select id, email, display_name, onboarding_completed, created_at
    from app_users
    where id = $1
  `,
    [userId],
  );

  const user = result.rows[0];

  if (!user) {
    throw new Error("Nie znaleziono użytkownika eksperymentalnego.");
  }

  return mapExperimentalUser(user);
}

export async function findUserIdByAuthIdentity(input: {
  provider: string;
  subject: string;
}) {
  const result = await queryPostgres<SocialIdentityRow>(
    `
      select id, user_id
      from auth_identities
      where provider = $1 and provider_subject = $2
    `,
    [input.provider, input.subject],
  );

  return result.rows[0]?.user_id ?? null;
}

export async function linkExistingUserToAuthIdentity(input: {
  provider: string;
  subject: string;
  email: string;
}) {
  return withPostgresTransaction(async (client) => {
    const matchingUsers = await client.query<SocialIdentityRow>(
      `
        select id, id as user_id
        from app_users
        where lower(email) = $1
        limit 2
      `,
      [input.email.trim().toLowerCase()],
    );

    const matchingUser =
      matchingUsers.rows.length === 1 ? matchingUsers.rows[0] : null;
    if (!matchingUser) return null;

    const identity = await client.query<SocialIdentityRow>(
      `
        insert into auth_identities (id, user_id, provider, provider_subject, email_at_login)
        values ($1, $2, $3, $4, $5)
        on conflict (provider, provider_subject) do update
        set email_at_login = excluded.email_at_login
        returning id, user_id
      `,
      [
        crypto.randomUUID(),
        matchingUser.user_id,
        input.provider,
        input.subject,
        input.email.trim().toLowerCase(),
      ],
    );

    return identity.rows[0]?.user_id ?? null;
  });
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
  const result = await queryPostgres<{ id: string }>(
    `
    select id
    from athletes
    where id = $1 and owner_user_id = $2
  `,
    [athleteId, ownerUserId],
  );

  if (!result.rows[0]) {
    throw new Error("Nie znaleziono zawodnika należącego do użytkownika.");
  }
}

async function getOwnedSectionId(
  ownerUserId: string,
  sectionId: string | null | undefined,
) {
  if (!sectionId) return null;

  const result = await queryPostgres<{ id: string }>(
    `
    select id
    from sections
    where id = $1 and owner_user_id = $2
  `,
    [sectionId, ownerUserId],
  );

  if (!result.rows[0]) {
    throw new Error("Nie znaleziono sekcji należącej do użytkownika.");
  }

  return sectionId;
}

async function getOwnedFacilityId(
  ownerUserId: string,
  facilityId: string | null | undefined,
) {
  if (!facilityId) return null;

  const result = await queryPostgres<{ id: string }>(
    `
    select id
    from facilities
    where id = $1 and owner_user_id = $2
  `,
    [facilityId, ownerUserId],
  );

  if (!result.rows[0]) {
    throw new Error("Nie znaleziono obiektu należącego do użytkownika.");
  }

  return facilityId;
}

export async function listAthletesFromPostgres(ownerUserId: string) {
  const result = await queryPostgres<AthleteRow>(
    `
    select id, source_id, name, first_name, last_name, nick, email, section_id, created_at
    from athletes
    where owner_user_id = $1
    order by created_at asc
  `,
    [ownerUserId],
  );

  return result.rows.map(mapAthlete);
}

export async function getPostgresDatabaseSnapshot(
  ownerUserId: string,
  chartRange?: { start: string; end: string },
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
    goals,
  ] = await Promise.all([
    listAthletesFromPostgres(ownerUserId),
    queryPostgres<SectionRow>(
      "select id, source_id, name, facility_id, created_at from sections where owner_user_id = $1 order by created_at asc",
      [ownerUserId],
    ),
    listFacilitiesFromPostgres(ownerUserId),
    queryPostgres<ClimbRow>(
      `
      select climbs.id, climbs.athlete_id, climbs.name, climbs.grade, climbs.created_at
      from climbs
      join athletes on athletes.id = climbs.athlete_id
      where athletes.owner_user_id = $1
      order by climbs.created_at asc
    `,
      [ownerUserId],
    ),
    listTrainingsFromPostgres(ownerUserId, undefined, chartRange),
    queryPostgres<AscentRow>(
      `
      select ascents.id, ascents.athlete_id, ascents.date, ascents.source,
        ascents.discipline, ascents.import_source, ascents.route_name, ascents.suggested_grade,
        ascents.subjective_grade, ascents.style, ascents.notes, ascents.created_at
      from ascents
      join athletes on athletes.id = ascents.athlete_id
      where athletes.owner_user_id = $1
      order by ascents.created_at desc
    `,
      [ownerUserId],
    ),
    queryPostgres<UserProfileRow>(
      `
      select user_profiles.key, user_profiles.athlete_id, user_profiles.birth_date,
        user_profiles.sex, user_profiles.height_cm, user_profiles.weight_kg,
        user_profiles.updated_at
      from user_profiles
      join athletes on athletes.id = user_profiles.athlete_id
      where athletes.owner_user_id = $1
      order by user_profiles.updated_at desc
    `,
      [ownerUserId],
    ),
    queryPostgres<WeightEntryRow>(
      `
      select weight_entries.id, weight_entries.athlete_id, weight_entries.date,
        weight_entries.time, weight_entries.weight_kg, weight_entries.created_at
      from weight_entries
      join athletes on athletes.id = weight_entries.athlete_id
      where athletes.owner_user_id = $1
        and ($2::text is null or weight_entries.date >= $2::text)
        and ($3::text is null or weight_entries.date <= $3::text)
      order by weight_entries.created_at desc
    `,
      [ownerUserId, chartRange?.start ?? null, chartRange?.end ?? null],
    ),
    queryPostgres<GoalRow>(
      `
      select athlete_goals.id, athlete_goals.athlete_id, athlete_goals.kind,
        athlete_goals.title, athlete_goals.target_value, athlete_goals.target_grade,
        athlete_goals.start_date, athlete_goals.end_date, athlete_goals.status,
        athlete_goals.created_at, athlete_goals.updated_at
      from athlete_goals
      join athletes on athletes.id = athlete_goals.athlete_id
      where athletes.owner_user_id = $1
      order by athlete_goals.status asc, athlete_goals.start_date desc
    `,
      [ownerUserId],
    ),
  ]);

  return {
    athletes,
    sections: sections.rows.map(mapSection),
    facilities,
    climbs: climbs.rows.map(mapClimb),
    trainings,
    ascents: ascents.rows.map(mapAscent),
    profiles: profiles.rows.map(mapUserProfile),
    weightEntries: weightEntries.rows.map(mapWeightEntry),
    goals: goals.rows.map(mapGoal),
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

  const displayNameParts = ownerUser.displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const ownerFirstName =
    ownerAthlete.firstName?.trim() || displayNameParts[0] || "";
  const ownerLastName =
    ownerAthlete.lastName?.trim() || displayNameParts.slice(1).join(" ");
  const ownerNick =
    ownerAthlete.nick?.trim() ||
    ownerUser.displayName.trim() ||
    ownerUser.email;
  const ownerName =
    (ownerAthlete.name !== "Zawodnik" && ownerAthlete.name.trim()) ||
    [ownerFirstName, ownerLastName].filter(Boolean).join(" ") ||
    ownerNick;
  const exportedOwnerAthlete: AthleteRecord = {
    ...ownerAthlete,
    name: ownerName,
    firstName: ownerFirstName,
    lastName: ownerLastName,
    nick: ownerNick,
    email: ownerAthlete.email?.trim() || ownerUser.email,
  };
  const athletes = snapshot.athletes.map((athlete) =>
    athlete.id === ownerAthlete.id ? exportedOwnerAthlete : athlete,
  );

  return {
    formatVersion: 3,
    exportedAt: new Date().toISOString(),
    ownerAthleteId: ownerAthlete.id,
    ownerEmail: ownerUser.email,
    ...createTrainingExportMetadata(snapshot.trainings),
    ...snapshot,
    athletes,
  };
}

export async function exportPostgresTrainingBackup(
  ownerUserId: string,
  trainingId: string,
): Promise<ClimberbookFullDatabaseBackup | null> {
  const backup = await exportPostgresDatabaseBackup(ownerUserId);
  const training = backup.trainings.find(
    (candidate) => candidate.id === trainingId,
  );

  if (!training) return null;

  const athlete = backup.athletes.find(
    (candidate) => candidate.id === training.athleteId,
  );

  if (!athlete) return null;

  return {
    ...backup,
    ...createTrainingExportMetadata([training]),
    ownerAthleteId: athlete.id,
    athletes: [{ ...athlete, sectionId: null }],
    sections: [],
    facilities: training.facilityId
      ? backup.facilities.filter(
          (facility) => facility.id === training.facilityId,
        )
      : [],
    climbs: [],
    trainings: [training],
    ascents: [],
    profiles: [],
    weightEntries: [],
  };
}

export async function createAthleteInPostgres(
  ownerUserId: string,
  input: AthleteInput,
) {
  const athleteId = crypto.randomUUID();
  const sectionId = await getOwnedSectionId(ownerUserId, input.sectionId);
  const result = await queryPostgres<AthleteRow>(
    `
    insert into athletes (
      id, source_id, name, first_name, last_name, nick, email, section_id, owner_user_id
    )
    values ($1, $1, $2, $3, $4, $5, $6, $7, $8)
    returning id, source_id, name, first_name, last_name, nick, email, section_id, created_at
  `,
    [
      athleteId,
      computeAthleteName(input),
      input.firstName?.trim() ?? "",
      input.lastName?.trim() ?? "",
      input.nick?.trim() ?? "",
      normalizeOptionalEmail(input.email),
      sectionId,
      ownerUserId,
    ],
  );

  return mapAthlete(result.rows[0]);
}

export async function updateAthleteInPostgres(
  ownerUserId: string,
  athleteId: string,
  input: AthleteInput,
) {
  const sectionId = await getOwnedSectionId(ownerUserId, input.sectionId);
  const result = await queryPostgres<AthleteRow>(
    `
    update athletes
    set name = $3,
      first_name = $4,
      last_name = $5,
      nick = $6,
      email = $7,
      section_id = $8
    where id = $1 and owner_user_id = $2
    returning id, source_id, name, first_name, last_name, nick, email, section_id, created_at
  `,
    [
      athleteId,
      ownerUserId,
      computeAthleteName(input),
      input.firstName?.trim() ?? "",
      input.lastName?.trim() ?? "",
      input.nick?.trim() ?? "",
      normalizeOptionalEmail(input.email),
      sectionId,
    ],
  );

  const athlete = result.rows[0];
  if (!athlete)
    throw new Error("Nie znaleziono zawodnika należącego do użytkownika.");

  return mapAthlete(athlete);
}

export async function deleteAthleteFromPostgres(
  ownerUserId: string,
  athleteId: string,
) {
  const result = await queryPostgres<{ id: string }>(
    `
    delete from athletes
    where id = $1 and owner_user_id = $2
    returning id
  `,
    [athleteId, ownerUserId],
  );

  if (!result.rows[0]) {
    throw new Error("Nie znaleziono zawodnika należącego do użytkownika.");
  }
}

export async function listTrainingsFromPostgres(
  ownerUserId: string,
  athleteId?: string,
  range?: { start: string; end: string },
) {
  const result = await queryPostgres<TrainingRow>(
    `
    select trainings.id, trainings.source_id, trainings.athlete_id,
      trainings.date, trainings.time, trainings.duration_minutes,
      trainings.age_years, trainings.calories_burned, trainings.attempts_count,
      trainings.difficulty_notes, trainings.difficulty_by_surface,
      trainings.protocol, trainings.load_profile, trainings.wellbeing, trainings.surfaces,
      trainings.custom_session_type, trainings.facility_name, trainings.facility_id, trainings.facility_version,
      trainings.weather_snapshot, trainings.rope_wall_name,
      trainings.rope_routes, trainings.notes,
      trainings.created_at
    from trainings
    join athletes on athletes.id = trainings.athlete_id
    where athletes.owner_user_id = $1
      and ($2::uuid is null or trainings.athlete_id = $2::uuid)
      and ($3::text is null or trainings.date >= $3::text)
      and ($4::text is null or trainings.date <= $4::text)
    order by trainings.date desc, trainings.time desc, trainings.created_at desc
  `,
    [ownerUserId, athleteId ?? null, range?.start ?? null, range?.end ?? null],
  );

  return result.rows.map(mapTraining);
}

export async function getTrainingFromPostgres(
  ownerUserId: string,
  trainingId: string,
) {
  const trainings = await listTrainingsFromPostgres(ownerUserId);
  const training = trainings.find((item) => item.id === trainingId);
  if (!training)
    throw new Error("Nie znaleziono treningu należącego do użytkownika.");
  return training;
}

export async function searchFacilitiesFromPostgres(
  ownerUserId: string,
  query: string,
) {
  const normalizedQuery = query.trim();
  const result = await queryPostgres<FacilityRow>(
    `
    select facilities.id, facility_versions.version as current_version,
      facility_versions.name, facility_versions.capabilities, facilities.visibility,
      facilities.owner_user_id as created_by,
      facilities.owner_user_id = $1 as is_owned_by_current_user,
      facility_versions.kind, facility_versions.location_label,
      facility_versions.latitude, facility_versions.longitude, facilities.created_at
    from facilities
    join lateral (
      select *
      from facility_versions
      where facility_versions.facility_id = facilities.id
      order by facility_versions.version desc
      limit 1
    ) facility_versions on true
    where (facilities.owner_user_id = $1 or facilities.visibility = 'global')
      and ($2::text = '' or facility_versions.name ilike '%' || $2 || '%'
        or facility_versions.location_label ilike '%' || $2 || '%')
    order by (facilities.owner_user_id = $1) desc, facility_versions.name asc
    limit 30
  `,
    [ownerUserId, normalizedQuery],
  );
  return result.rows.map(mapFacility);
}

export async function getDefaultFacilityFromPostgres(ownerUserId: string) {
  const result = await queryPostgres<FacilityRow>(
    `
    select facilities.id, facility_versions.version as current_version,
      facility_versions.name, facility_versions.capabilities, facilities.visibility,
      facilities.owner_user_id as created_by,
      facilities.owner_user_id = $1 as is_owned_by_current_user,
      facility_versions.kind, facility_versions.location_label,
      facility_versions.latitude, facility_versions.longitude, facilities.created_at
    from facilities
    join lateral (
      select *
      from facility_versions
      where facility_versions.facility_id = facilities.id
      order by facility_versions.version desc
      limit 1
    ) facility_versions on true
    where facilities.owner_user_id = $1 or facilities.visibility = 'global'
    order by coalesce((
      select max(trainings.date || 'T' || trainings.time)
      from trainings
      join athletes on athletes.id = trainings.athlete_id
      where athletes.owner_user_id = $1 and trainings.facility_id = facilities.id
    ), '') desc, (facilities.owner_user_id = $1) desc, facility_versions.name asc
    limit 1
  `,
    [ownerUserId],
  );
  return result.rows[0] ? mapFacility(result.rows[0]) : null;
}

function describeConditions(
  training: TrainingRecord,
  facilities: FacilityRecord[],
) {
  const weather = training.weatherSnapshot;
  const facility = facilities.find((item) => item.id === training.facilityId);
  const isWinter = [12, 1, 2].includes(Number(training.date.slice(5, 7)));

  if (!weather) {
    return "Brak zapisanego pomiaru pogody, więc nie można rzetelnie oszacować temperatury podczas tej jednostki.";
  }

  const outdoor = `${weather.temperatureC.toFixed(0)}°C na zewnątrz`;
  if (facility?.kind === "crag" || facility?.kind === "crag_sector") {
    return `Warunki zewnętrzne przy zapisie: ${outdoor}, wilgotność ${weather.relativeHumidity}% i wiatr ${weather.windSpeedKmh.toFixed(0)} km/h.`;
  }
  if (facility?.capabilities.hasAirConditioning === true) {
    return `Na zewnątrz było ${outdoor}. Obiekt deklaruje klimatyzację, dlatego nie wyciągam temperatury wewnątrz z danych zewnętrznych.`;
  }
  if (isWinter) {
    const lowerEstimate = Math.max(6, Math.round(weather.temperatureC + 3));
    const upperEstimate = Math.max(
      lowerEstimate + 4,
      Math.round(weather.temperatureC + 9),
    );
    return `Na zewnątrz było ${outdoor}. Obiekt nie deklaruje klimatyzacji ani nie mamy informacji o ogrzewaniu; jeśli zimą nie grzano, wewnątrz mogło być orientacyjnie ${lowerEstimate}-${upperEstimate}°C. To wyłącznie szacunek, nie pomiar.`;
  }
  const lowerEstimate = Math.round(weather.temperatureC + 2);
  const upperEstimate = Math.round(weather.temperatureC + 6);
  return `Na zewnątrz było ${outdoor}. Obiekt nie deklaruje klimatyzacji, więc wewnątrz mogło być orientacyjnie ${lowerEstimate}-${upperEstimate}°C; bez pomiaru to ostrożny szacunek.`;
}

function describeTrainingData(training: TrainingRecord) {
  const activities =
    training.surfaces.join(", ") || "brak zapisanej aktywności";
  const grades = training.difficultyBySurface
    ? Object.entries(training.difficultyBySurface)
        .filter(([, value]) => typeof value === "string" && value.trim())
        .map(([surface, value]) => {
          const gradeList = value
            .split(",")
            .map((grade) => grade.trim())
            .filter(Boolean);
          const visibleGrades = gradeList.slice(0, 5).join(", ");
          const remainingGrades = gradeList.length - 5;
          return `${surface}: ${visibleGrades}${remainingGrades > 0 ? ` (+${remainingGrades} kolejnych)` : ""}`;
        })
        .join("; ")
    : "";
  const routes = training.ropeRoutes
    ?.map(
      (route) =>
        `${route.completed} x ${route.grade}${route.ropeWallName ? ` (${route.ropeWallName})` : ""}`,
    )
    .join(", ");
  return [
    `W surowym zapisie widzimy: ${activities}.`,
    grades ? `Zapisane wyceny: ${grades}.` : "Brak zapisanej wyceny.",
    routes ? `Drogi: ${routes}.` : "",
    `${training.attemptsCount} prób${training.wellbeing ? ` oraz samopoczucie: ${training.wellbeing}` : ""}.`,
    training.notes.trim()
      ? `Notatka zawodnika: „${training.notes.trim()}”`
      : "Brak dodatkowej notatki z treningu.",
  ]
    .filter(Boolean)
    .join(" ");
}

function describeRecentHistory(
  training: TrainingRecord,
  previousTrainings: TrainingRecord[],
) {
  if (previousTrainings.length === 0) {
    return "Nie ma wcześniejszych zapisanych treningów, więc ta sesja stanowi pierwszy punkt odniesienia.";
  }
  const priorDuration = previousTrainings.reduce(
    (total, item) => total + item.durationMinutes,
    0,
  );
  const priorAttempts = previousTrainings.reduce(
    (total, item) => total + item.attemptsCount,
    0,
  );
  const averageDuration = Math.round(priorDuration / previousTrainings.length);
  const difference = training.durationMinutes - averageDuration;
  const durationComment =
    difference === 0
      ? "dokładnie na poziomie średniej"
      : difference > 0
        ? `${difference} min powyżej średniej`
        : `${Math.abs(difference)} min poniżej średniej`;
  return `Punkt odniesienia to ${previousTrainings.length} wcześniejszych treningów: łącznie ${priorDuration} min i ${priorAttempts} prób. Dzisiejsze ${training.durationMinutes} min jest ${durationComment}; to czytelny element ciągłości pracy, nie samodzielna ocena formy.`;
}

function formatSummaryDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function getSingleTrainingSummaryTitle(training: TrainingRecord) {
  const facility = training.facilityName ?? "Miejsce nie zostało zapisane";
  const ropeWall = training.ropeWallName ? `, ${training.ropeWallName}` : "";
  return `${formatSummaryDate(training.date)}, ${facility}${ropeWall} ${training.time}`;
}

function createSummaryContent(
  scope: TrainingSummaryScope,
  periodStart: string,
  periodEnd: string,
  trainings: TrainingRecord[],
  facilities: FacilityRecord[],
  previousTrainings: TrainingRecord[],
  coachComment: string,
) {
  const trainingCount = trainings.length;
  const totalDurationMinutes = trainings.reduce(
    (total, training) => total + training.durationMinutes,
    0,
  );
  const totalAttempts = trainings.reduce(
    (total, training) => total + training.attemptsCount,
    0,
  );
  const durationText = `${Math.floor(totalDurationMinutes / 60)} h ${totalDurationMinutes % 60} min`;
  const label =
    scope === "training" ? "Trening" : scope === "week" ? "Tydzień" : "Miesiąc";
  const noteExcerpts = trainings
    .map((training) => training.notes.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((note) => `„${note.slice(0, 240)}${note.length > 240 ? "..." : ""}”`);
  const dimensions = trainings
    .flatMap((training) =>
      getObjectiveStimulusActivities(training, facilities, trainings),
    )
    .reduce(
      (total, activity) => ({
        aerobicEndurance:
          total.aerobicEndurance +
          (activity.dimensionCoin?.aerobicEndurance ??
            activity.coin * activity.dimensionSplit.aerobicEndurance),
        strengthEndurance:
          total.strengthEndurance +
          (activity.dimensionCoin?.strengthEndurance ??
            activity.coin * activity.dimensionSplit.strengthEndurance),
        strengthPower:
          total.strengthPower +
          (activity.dimensionCoin?.strengthPower ??
            activity.coin * activity.dimensionSplit.strengthPower),
        contactStrength:
          total.contactStrength +
          (activity.dimensionCoin?.contactStrength ??
            activity.coin * activity.dimensionSplit.contactStrength),
      }),
      {
        aerobicEndurance: 0,
        strengthEndurance: 0,
        strengthPower: 0,
        contactStrength: 0,
      },
    );
  const coin = Object.values(dimensions).reduce(
    (total, value) => total + value,
    0,
  );
  const singleTraining = scope === "training" ? trainings[0] : undefined;
  const dominantDimensions = Object.entries(dimensions)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 2)
    .map(([dimension]) => dimension)
    .join(" i ");
  const weeklyLocations = trainings
    .map((training) =>
      [
        `### ${training.date}: ${training.facilityName ?? "Miejsce nie zostało zapisane"}`,
        `Start o ${training.time}, czas trwania ${training.durationMinutes} min. ${describeConditions(training, facilities)}`,
        describeTrainingData(training),
      ].join("\n\n"),
    )
    .join("\n\n");
  return {
    title: singleTraining
      ? getSingleTrainingSummaryTitle(singleTraining)
      : `${label}: ${periodStart}${periodStart === periodEnd ? "" : ` - ${periodEnd}`}`,
    text: singleTraining
      ? [
          "### O której i ile trwał",
          `${singleTraining.durationMinutes} min. ${describeConditions(singleTraining, facilities)}`,
          "### Co zostało zrobione",
          describeTrainingData(singleTraining),
          "### W odniesieniu do ostatnich treningów",
          describeRecentHistory(singleTraining, previousTrainings),
          "### Komentarz trenerski",
          coachComment,
        ].join("\n\n")
      : [
          "## Gdzie były treningi",
          weeklyLocations || "Brak treningów w podanym okresie.",
          "## O której i ile trwały",
          `${trainingCount} trening(i) w okresie ${periodStart}${periodStart === periodEnd ? "" : ` - ${periodEnd}`}; łączny czas: ${durationText}; łącznie ${totalAttempts} prób.`,
          "### Co wynika z surowych danych",
          noteExcerpts.length
            ? `Notatki z treningów: ${noteExcerpts.join("; ")}`
            : "Brak opisów użytkownika do uwzględnienia.",
          `Dominujący bodziec: ${dominantDimensions || "brak wystarczających danych"}; suma: ${coin.toFixed(3)} coin. To faktograficzny punkt wyjścia, nie ocena formy.`,
          "### W odniesieniu do ostatnich treningów",
          trainings[0]
            ? describeRecentHistory(trainings[0], previousTrainings)
            : "Brak danych porównawczych.",
          "### Komentarz trenerski",
          coachComment,
        ].join("\n\n"),
    trainingCount,
    totalDurationMinutes,
    totalAttempts,
    stimulus: {
      algorithmVersion: getStimulusCatalog().algorithmVersion,
      coin,
      dimensions,
    },
  };
}

export async function summarizeTrainingsInPostgres(input: {
  ownerUserId: string;
  scope: TrainingSummaryScope;
  periodStart: string;
  periodEnd: string;
  trainingId?: string;
  coachComment: string;
}) {
  const allTrainings = await listTrainingsFromPostgres(input.ownerUserId);
  const trainings = input.trainingId
    ? [
        allTrainings.find((training) => training.id === input.trainingId) ??
          (await getTrainingFromPostgres(input.ownerUserId, input.trainingId)),
      ]
    : allTrainings.filter(
        (training) =>
          training.date >= input.periodStart &&
          training.date <= input.periodEnd,
      );
  const referenceTraining = trainings[0];
  const previousTrainings = referenceTraining
    ? allTrainings
        .filter((training) =>
          training.athleteId === referenceTraining.athleteId && input.trainingId
            ? `${training.date}T${training.time}` <
              `${referenceTraining.date}T${referenceTraining.time}`
            : training.date < input.periodStart,
        )
        .slice(0, 7)
    : [];
  const facilities = await listFacilitiesFromPostgres(input.ownerUserId);
  const content = createSummaryContent(
    input.scope,
    input.periodStart,
    input.periodEnd,
    trainings,
    facilities,
    previousTrainings,
    input.coachComment,
  );
  const result = await queryPostgres<TrainingSummaryRow>(
    `
    insert into training_summaries (id, owner_user_id, scope, period_start, period_end, training_id, content)
    values ($1, $2, $3, $4, $5, $6, $7)
    on conflict (owner_user_id, scope, period_start, period_end, training_id) do nothing
    returning id, scope, period_start, period_end, training_id, content, created_at, updated_at
  `,
    [
      crypto.randomUUID(),
      input.ownerUserId,
      input.scope,
      input.periodStart,
      input.periodEnd,
      input.trainingId ?? null,
      content,
    ],
  );
  if (result.rows[0]) return mapTrainingSummary(result.rows[0]);

  const existing = await queryPostgres<TrainingSummaryRow>(
    `select id, scope, period_start, period_end, training_id, content, created_at, updated_at
     from training_summaries
     where owner_user_id = $1 and scope = $2 and period_start = $3 and period_end = $4
       and training_id is not distinct from $5`,
    [
      input.ownerUserId,
      input.scope,
      input.periodStart,
      input.periodEnd,
      input.trainingId ?? null,
    ],
  );
  return mapTrainingSummary(existing.rows[0]);
}

export async function listAgentActionsFromPostgres(ownerUserId: string) {
  const result = await queryPostgres<AgentActionRow>(
    `select id, kind, status, title, details, created_at, completed_at
     from agent_actions where owner_user_id = $1 order by status asc, created_at desc`,
    [ownerUserId],
  );
  return result.rows.map(mapAgentAction);
}

export async function listTrainingSummariesFromPostgres(ownerUserId: string) {
  const result = await queryPostgres<TrainingSummaryRow>(
    `select id, scope, period_start, period_end, training_id, content, created_at, updated_at
     from training_summaries where owner_user_id = $1
     order by period_end desc, updated_at desc`,
    [ownerUserId],
  );
  return result.rows.map(mapTrainingSummary);
}

export async function deleteTrainingSummaryFromPostgres(
  ownerUserId: string,
  summaryId: string,
) {
  const result = await queryPostgres<{ id: string }>(
    `
    delete from training_summaries
    where id = $1 and owner_user_id = $2
    returning id
  `,
    [summaryId, ownerUserId],
  );
  if (!result.rows[0]) {
    throw new Error("Nie znaleziono podsumowania należącego do użytkownika.");
  }
  return { id: result.rows[0].id, deleted: true };
}

export async function listAgentFeedItemsFromPostgres(ownerUserId: string) {
  const result = await queryPostgres<AgentFeedItemRow>(
    `select id, kind, title, body, training_id, published_at
     from agent_feed_items where owner_user_id = $1
     order by published_at desc`,
    [ownerUserId],
  );
  return result.rows.map(mapAgentFeedItem);
}

export async function deleteAgentFeedItemFromPostgres(
  ownerUserId: string,
  feedItemId: string,
) {
  const result = await queryPostgres<{ id: string }>(
    `
    delete from agent_feed_items
    where id = $1 and owner_user_id = $2
    returning id
  `,
    [feedItemId, ownerUserId],
  );
  if (!result.rows[0]) {
    throw new Error("Nie znaleziono wpisu walla należącego do użytkownika.");
  }
  return { id: result.rows[0].id, deleted: true };
}

export async function createAgentFeedItemInPostgres(
  ownerUserId: string,
  input: Pick<AgentFeedItemRecord, "kind" | "title" | "body" | "trainingId">,
) {
  if (input.trainingId)
    await getTrainingFromPostgres(ownerUserId, input.trainingId);
  const result = await queryPostgres<AgentFeedItemRow>(
    `insert into agent_feed_items (id, owner_user_id, kind, title, body, training_id)
     values ($1, $2, $3, $4, $5, $6)
     returning id, kind, title, body, training_id, published_at`,
    [
      crypto.randomUUID(),
      ownerUserId,
      input.kind,
      input.title.trim(),
      input.body.trim(),
      input.trainingId ?? null,
    ],
  );
  return mapAgentFeedItem(result.rows[0]);
}

export async function createAgentActionInPostgres(
  ownerUserId: string,
  input: Pick<AgentActionRecord, "kind" | "title" | "details">,
) {
  const result = await queryPostgres<AgentActionRow>(
    `insert into agent_actions (id, owner_user_id, kind, title, details)
     values ($1, $2, $3, $4, $5)
     returning id, kind, status, title, details, created_at, completed_at`,
    [crypto.randomUUID(), ownerUserId, input.kind, input.title, input.details],
  );
  return mapAgentAction(result.rows[0]);
}

export async function completeAgentActionInPostgres(
  ownerUserId: string,
  actionId: string,
) {
  const result = await queryPostgres<AgentActionRow>(
    `update agent_actions set status = 'done', completed_at = now()
     where id = $1 and owner_user_id = $2
     returning id, kind, status, title, details, created_at, completed_at`,
    [actionId, ownerUserId],
  );
  if (!result.rows[0]) throw new Error("Nie znaleziono akcji agenta.");
  return mapAgentAction(result.rows[0]);
}

export async function createGoalInPostgres(
  ownerUserId: string,
  input: Omit<GoalRecord, "id" | "createdAt" | "updatedAt">,
) {
  await requireOwnedAthlete(ownerUserId, input.athleteId);
  const result = await queryPostgres<GoalRow>(
    `insert into athlete_goals (
      id, athlete_id, kind, title, target_value, target_grade, start_date, end_date, status
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    returning id, athlete_id, kind, title, target_value, target_grade, start_date, end_date, status, created_at, updated_at`,
    [
      crypto.randomUUID(),
      input.athleteId,
      input.kind,
      input.title.trim(),
      input.targetValue,
      input.targetGrade?.trim() || null,
      input.startDate,
      input.endDate ?? null,
      input.status,
    ],
  );
  return mapGoal(result.rows[0]);
}

export async function updateGoalInPostgres(
  ownerUserId: string,
  input: Omit<GoalRecord, "createdAt" | "updatedAt">,
) {
  await requireOwnedAthlete(ownerUserId, input.athleteId);
  const result = await queryPostgres<GoalRow>(
    `update athlete_goals set athlete_id = $2, kind = $3, title = $4,
      target_value = $5, target_grade = $6, start_date = $7, end_date = $8,
      status = $9, updated_at = now()
    where id = $1 and exists (
      select 1 from athletes
      where athletes.id = athlete_goals.athlete_id and athletes.owner_user_id = $10
    )
    returning id, athlete_id, kind, title, target_value, target_grade, start_date, end_date, status, created_at, updated_at`,
    [
      input.id,
      input.athleteId,
      input.kind,
      input.title.trim(),
      input.targetValue,
      input.targetGrade?.trim() || null,
      input.startDate,
      input.endDate ?? null,
      input.status,
      ownerUserId,
    ],
  );
  if (!result.rows[0])
    throw new Error("Nie znaleziono celu należącego do użytkownika.");
  return mapGoal(result.rows[0]);
}

export async function deleteGoalFromPostgres(
  ownerUserId: string,
  goalId: string,
) {
  const result = await queryPostgres<{ id: string }>(
    `delete from athlete_goals where id = $1 and exists (
      select 1 from athletes
      where athletes.id = athlete_goals.athlete_id and athletes.owner_user_id = $2
    ) returning id`,
    [goalId, ownerUserId],
  );
  if (!result.rows[0])
    throw new Error("Nie znaleziono celu należącego do użytkownika.");
  return { id: result.rows[0].id, deleted: true };
}

export async function createTrainingInPostgres(
  ownerUserId: string,
  input: Omit<TrainingRecord, "id" | "createdAt">,
) {
  await requireOwnedAthlete(ownerUserId, input.athleteId);

  const trainingId = crypto.randomUUID();
  const sourceId = input.sourceId ?? trainingId;
  const result = await queryPostgres<TrainingRow>(
    `
    insert into trainings (
      id, source_id, athlete_id, date, time, duration_minutes,
      age_years, calories_burned, attempts_count, difficulty_notes,
      difficulty_by_surface, protocol, load_profile, wellbeing, surfaces, facility_name,
      facility_id, facility_version, weather_snapshot, rope_wall_name, rope_routes, custom_session_type, notes
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
    returning id, source_id, athlete_id, date, time, duration_minutes,
      age_years, calories_burned, attempts_count, difficulty_notes,
      difficulty_by_surface, protocol, load_profile, wellbeing, surfaces, custom_session_type,
      facility_name, facility_id, facility_version, weather_snapshot, rope_wall_name, rope_routes, notes, created_at
  `,
    [
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
      input.loadProfile ?? null,
      input.wellbeing,
      input.surfaces,
      input.facilityName ?? null,
      input.facilityId ?? null,
      input.facilityVersion ?? null,
      input.weatherSnapshot ?? null,
      input.ropeWallName ?? null,
      input.ropeRoutes ? JSON.stringify(input.ropeRoutes) : null,
      input.customSessionType ?? null,
      input.notes,
    ],
  );

  return mapTraining(result.rows[0]);
}

export async function updateTrainingInPostgres(
  ownerUserId: string,
  input: Omit<TrainingRecord, "createdAt">,
) {
  await requireOwnedAthlete(ownerUserId, input.athleteId);
  const result = await queryPostgres<TrainingRow>(
    `
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
      load_profile = $12,
      wellbeing = $13,
      surfaces = $14,
      facility_name = $15,
      facility_id = $16,
      facility_version = $17,
      weather_snapshot = $18,
      rope_wall_name = $19,
      rope_routes = $20,
      custom_session_type = $21,
      notes = $22
    where id = $1
      and exists (
        select 1
        from athletes
        where athletes.id = trainings.athlete_id
          and athletes.owner_user_id = $23
      )
    returning id, source_id, athlete_id, date, time, duration_minutes,
      age_years, calories_burned, attempts_count, difficulty_notes,
      difficulty_by_surface, protocol, load_profile, wellbeing, surfaces, custom_session_type,
      facility_name, facility_id, facility_version, weather_snapshot, rope_wall_name, rope_routes, notes, created_at
  `,
    [
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
      input.loadProfile ?? null,
      input.wellbeing,
      input.surfaces,
      input.facilityName ?? null,
      input.facilityId ?? null,
      input.facilityVersion ?? null,
      input.weatherSnapshot ?? null,
      input.ropeWallName ?? null,
      input.ropeRoutes ? JSON.stringify(input.ropeRoutes) : null,
      input.customSessionType ?? null,
      input.notes,
      ownerUserId,
    ],
  );

  const training = result.rows[0];
  if (!training)
    throw new Error("Nie znaleziono treningu należącego do użytkownika.");

  return mapTraining(training);
}

export async function deleteTrainingFromPostgres(
  ownerUserId: string,
  trainingId: string,
) {
  const result = await queryPostgres<{ id: string }>(
    `
    delete from trainings
    where id = $1
      and exists (
        select 1
        from athletes
        where athletes.id = trainings.athlete_id
          and athletes.owner_user_id = $2
      )
    returning id
  `,
    [trainingId, ownerUserId],
  );

  if (!result.rows[0]) {
    throw new Error("Nie znaleziono treningu należącego do użytkownika.");
  }
}

const publicTrainingSurfaceLabels: Record<
  TrainingRecord["surfaces"][number],
  string
> = {
  lina: "Wspinanie z liną",
  baldy: "Bouldering",
  moon: "MoonBoard",
  drazek: "Drążek",
  spraywall: "Spraywall",
  kilter: "Kilter Board",
  silownia: "Siłownia",
  chwytotablica: "Chwytotablica",
  campus: "Campus",
  bieznia: "Bieżnia",
  rower: "Rower",
  bieg: "Bieg",
  treking: "Trekking",
};

function createPublicTrainingShareSnapshot(
  training: TrainingRecord,
  stimulusNormPercent: number | undefined,
  stimulusLabel: string | undefined,
  stimulusDimensions: PublicTrainingShare["stimulusDimensions"],
): Omit<PublicTrainingShare, "id" | "createdAt"> {
  const grades = Object.values(training.difficultyBySurface ?? {})
    .flatMap((value) => value?.split(",") ?? [])
    .map((grade) => grade.trim())
    .filter(Boolean)
    .slice(0, 12);
  const activity =
    training.customSessionType?.trim() ||
    training.surfaces
      .slice(0, 3)
      .map((surface) => publicTrainingSurfaceLabels[surface])
      .join(" • ") ||
    "Trening wspinaczkowy";

  return {
    activity,
    date: training.date,
    time: training.time,
    durationMinutes: training.durationMinutes,
    ageYears: training.ageYears,
    caloriesBurned: Math.max(training.caloriesBurned, 0),
    attemptsCount: Math.max(training.attemptsCount, 0),
    stimulusNormPercent,
    stimulusLabel,
    stimulusDimensions,
    facilityName: training.facilityName?.trim() || undefined,
    surfaces: training.surfaces,
    grades,
    difficultyBySurface: training.difficultyBySurface,
    difficultyNotes: training.difficultyNotes.trim(),
    wellbeing: training.wellbeing.trim(),
    notes: training.notes.trim(),
    ropeRoutes: training.ropeRoutes?.map((route) => ({ ...route })),
    weatherSnapshot: training.weatherSnapshot,
  };
}

type PublicTrainingShareRow = {
  share_id: string;
  owner_user_id: string;
  training_id: string;
  image_data: Buffer | null;
  image_content_type: string | null;
  snapshot: Partial<Omit<PublicTrainingShare, "id" | "createdAt">> &
    Pick<
      PublicTrainingShare,
      | "activity"
      | "date"
      | "durationMinutes"
      | "caloriesBurned"
      | "attemptsCount"
      | "grades"
    >;
  created_at: Date;
};

function mapPublicTrainingShare(
  row: PublicTrainingShareRow,
): PublicTrainingShare {
  return {
    id: row.share_id,
    time: "",
    ageYears: 0,
    surfaces: [],
    difficultyNotes: "",
    wellbeing: "",
    notes: "",
    ...row.snapshot,
    createdAt: row.created_at.toISOString(),
  };
}

export async function createPublicTrainingShareInPostgres(
  ownerUserId: string,
  trainingId: string,
  stimulusLabel?: string,
) {
  const trainingResult = await queryPostgres<TrainingRow>(
    `
      select trainings.*
      from trainings
      join athletes on athletes.id = trainings.athlete_id
      where trainings.id = $1 and athletes.owner_user_id = $2
    `,
    [trainingId, ownerUserId],
  );
  const training = trainingResult.rows[0];
  if (!training)
    throw new Error("Nie znaleziono treningu należącego do użytkownika.");

  const mappedTraining = mapTraining(training);
  const [referenceTrainings, facilities] = await Promise.all([
    listTrainingsFromPostgres(ownerUserId, mappedTraining.athleteId),
    listFacilitiesFromPostgres(ownerUserId),
  ]);
  const stimulusScale = getTrainingStimulusScale(
    mappedTraining,
    referenceTrainings,
    facilities,
  );
  const stimulusImpact = getTrainingStimulusImpact(
    mappedTraining,
    facilities,
    referenceTrainings,
  );
  const snapshot = createPublicTrainingShareSnapshot(
    mappedTraining,
    stimulusScale ? Math.round(stimulusScale.ratio * 100) : undefined,
    stimulusLabel,
    stimulusImpact.dimensions,
  );
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const shareId = randomBytes(9).toString("base64url");
    const result = await queryPostgres<PublicTrainingShareRow>(
      `
        insert into public_training_shares (
          share_id, owner_user_id, training_id, snapshot
        )
        values ($1, $2, $3, $4::jsonb)
        on conflict (share_id) do nothing
        returning share_id, owner_user_id, training_id, image_data, image_content_type, snapshot, created_at
      `,
      [shareId, ownerUserId, trainingId, JSON.stringify(snapshot)],
    );
    if (result.rows[0]) return mapPublicTrainingShare(result.rows[0]);
  }

  throw new Error("Nie udało się utworzyć publicznego linku treningu.");
}

export async function getPublicTrainingShareFromPostgres(shareId: string) {
  const result = await queryPostgres<PublicTrainingShareRow>(
    `
      select share_id, owner_user_id, training_id, image_data, image_content_type, snapshot, created_at
      from public_training_shares
      where share_id = $1
    `,
    [shareId],
  );
  const row = result.rows[0];
  if (!row) return null;

  const share = mapPublicTrainingShare(row);
  if (
    share.stimulusNormPercent !== undefined &&
    share.stimulusDimensions !== undefined
  )
    return share;

  const training = await getTrainingFromPostgres(
    row.owner_user_id,
    row.training_id,
  );
  const [referenceTrainings, facilities] = await Promise.all([
    listTrainingsFromPostgres(row.owner_user_id, training.athleteId),
    listFacilitiesFromPostgres(row.owner_user_id),
  ]);
  const stimulusScale = getTrainingStimulusScale(
    training,
    referenceTrainings,
    facilities,
  );
  const stimulusImpact = getTrainingStimulusImpact(
    training,
    facilities,
    referenceTrainings,
  );
  return {
    ...share,
    stimulusNormPercent: stimulusScale
      ? Math.round(stimulusScale.ratio * 100)
      : undefined,
    stimulusDimensions: stimulusImpact.dimensions,
  };
}

export async function savePublicTrainingShareImageInPostgres(
  ownerUserId: string,
  shareId: string,
  imageData: Buffer,
) {
  const result = await queryPostgres<{ share_id: string }>(
    `
      update public_training_shares
      set image_data = $3, image_content_type = 'image/jpeg'
      where share_id = $1 and owner_user_id = $2
      returning share_id
    `,
    [shareId, ownerUserId, imageData],
  );
  if (!result.rows[0])
    throw new Error("Nie znaleziono linku należącego do użytkownika.");
}

export async function getPublicTrainingShareImageFromPostgres(shareId: string) {
  const result = await queryPostgres<{
    image_data: Buffer | null;
    image_content_type: string | null;
  }>(
    `select image_data, image_content_type from public_training_shares where share_id = $1`,
    [shareId],
  );
  const image = result.rows[0];
  return image?.image_data && image.image_content_type
    ? { data: image.image_data, contentType: image.image_content_type }
    : null;
}

export async function listClimbsFromPostgres(
  ownerUserId: string,
  athleteId: string,
) {
  await requireOwnedAthlete(ownerUserId, athleteId);
  const result = await queryPostgres<ClimbRow>(
    `
    select id, athlete_id, name, grade, created_at
    from climbs
    where athlete_id = $1
    order by created_at asc
  `,
    [athleteId],
  );

  return result.rows.map(mapClimb);
}

export async function createClimbInPostgres(
  ownerUserId: string,
  input: Omit<ClimbRecord, "id" | "createdAt">,
) {
  await requireOwnedAthlete(ownerUserId, input.athleteId);
  const result = await queryPostgres<ClimbRow>(
    `
    insert into climbs (athlete_id, name, grade)
    values ($1, $2, $3)
    returning id, athlete_id, name, grade, created_at
  `,
    [input.athleteId, input.name.trim(), input.grade.trim()],
  );

  return mapClimb(result.rows[0]);
}

export async function updateClimbInPostgres(
  ownerUserId: string,
  input: Required<Pick<ClimbRecord, "id">> &
    Omit<ClimbRecord, "id" | "createdAt">,
) {
  const result = await queryPostgres<ClimbRow>(
    `
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
  `,
    [
      input.id,
      input.name.trim(),
      input.grade.trim(),
      input.athleteId,
      ownerUserId,
    ],
  );

  const climb = result.rows[0];
  if (!climb)
    throw new Error("Nie znaleziono wspinaczki należącej do użytkownika.");

  return mapClimb(climb);
}

export async function deleteClimbFromPostgres(
  ownerUserId: string,
  climbId: number,
) {
  const result = await queryPostgres<{ id: number }>(
    `
    delete from climbs
    where id = $1
      and exists (
        select 1
        from athletes
        where athletes.id = climbs.athlete_id
          and athletes.owner_user_id = $2
      )
    returning id
  `,
    [climbId, ownerUserId],
  );

  if (!result.rows[0]) {
    throw new Error("Nie znaleziono wspinaczki należącej do użytkownika.");
  }
}

export async function getUserProfileFromPostgres(
  ownerUserId: string,
  athleteId: string,
) {
  await requireOwnedAthlete(ownerUserId, athleteId);
  const result = await queryPostgres<UserProfileRow>(
    `
    select key, athlete_id, birth_date, sex, height_cm, weight_kg, updated_at
    from user_profiles
    where athlete_id = $1
  `,
    [athleteId],
  );

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
  const result = await queryPostgres<UserProfileRow>(
    `
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
  `,
    [
      `athlete:${input.athleteId}`,
      input.athleteId,
      input.birthDate,
      input.sex,
      input.heightCm,
      input.weightKg,
    ],
  );

  return mapUserProfile(result.rows[0]);
}

export async function listWeightEntriesFromPostgres(
  ownerUserId: string,
  athleteId: string,
  range?: { start: string; end: string },
) {
  await requireOwnedAthlete(ownerUserId, athleteId);
  const result = await queryPostgres<WeightEntryRow>(
    `
    select id, athlete_id, date, time, weight_kg, created_at
    from weight_entries
    where athlete_id = $1
      and ($2::text is null or date >= $2::text)
      and ($3::text is null or date <= $3::text)
    order by date desc, time desc, created_at desc
  `,
    [athleteId, range?.start ?? null, range?.end ?? null],
  );

  return result.rows.map(mapWeightEntry);
}

export async function createWeightEntryInPostgres(
  ownerUserId: string,
  input: Omit<WeightEntryRecord, "id" | "createdAt">,
) {
  await requireOwnedAthlete(ownerUserId, input.athleteId);
  const result = await queryPostgres<WeightEntryRow>(
    `
    insert into weight_entries (athlete_id, date, time, weight_kg)
    values ($1, $2, $3, $4)
    returning id, athlete_id, date, time, weight_kg, created_at
  `,
    [input.athleteId, input.date, input.time, input.weightKg],
  );

  return mapWeightEntry(result.rows[0]);
}

export async function updateWeightEntryInPostgres(
  ownerUserId: string,
  input: Required<Pick<WeightEntryRecord, "id">> &
    Omit<WeightEntryRecord, "id" | "createdAt">,
) {
  const result = await queryPostgres<WeightEntryRow>(
    `
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
  `,
    [
      input.id,
      input.date,
      input.time,
      input.weightKg,
      input.athleteId,
      ownerUserId,
    ],
  );

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
  const result = await queryPostgres<{ id: number }>(
    `
    delete from weight_entries
    where id = $1
      and exists (
        select 1
        from athletes
        where athletes.id = weight_entries.athlete_id
          and athletes.owner_user_id = $2
      )
    returning id
  `,
    [entryId, ownerUserId],
  );

  if (!result.rows[0]) {
    throw new Error("Nie znaleziono wpisu wagi należącego do użytkownika.");
  }
}

export async function listAscentsFromPostgres(
  ownerUserId: string,
  athleteId: string,
) {
  await requireOwnedAthlete(ownerUserId, athleteId);
  const result = await queryPostgres<AscentRow>(
    `
    select id, athlete_id, date, source, discipline, import_source, route_name,
      suggested_grade, subjective_grade, style, notes, created_at
    from ascents
    where athlete_id = $1
    order by created_at desc
  `,
    [athleteId],
  );

  return result.rows.map(mapAscent);
}

export async function createAscentInPostgres(
  ownerUserId: string,
  input: Omit<AscentRecord, "id" | "createdAt">,
) {
  await requireOwnedAthlete(ownerUserId, input.athleteId);
  const result = await queryPostgres<AscentRow>(
    `
    insert into ascents (
      athlete_id, date, source, discipline, import_source, route_name, suggested_grade,
      subjective_grade, style, notes
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    returning id, athlete_id, date, source, discipline, import_source, route_name,
      suggested_grade, subjective_grade, style, notes, created_at
  `,
    [
      input.athleteId,
      input.date,
      input.source,
      input.discipline ?? null,
      input.importSource ?? null,
      input.routeName,
      input.suggestedGrade,
      input.subjectiveGrade,
      input.style ?? null,
      input.notes,
    ],
  );

  return mapAscent(result.rows[0]);
}

export async function importAscentsToPostgres(
  ownerUserId: string,
  input: {
    create: Array<Omit<AscentRecord, "id" | "createdAt">>;
    update: Array<
      Required<Pick<AscentRecord, "id">> &
        Omit<AscentRecord, "id" | "createdAt">
    >;
  },
) {
  const athleteIds = new Set(
    [...input.create, ...input.update].map((ascent) => ascent.athleteId),
  );
  await Promise.all(
    [...athleteIds].map((athleteId) =>
      requireOwnedAthlete(ownerUserId, athleteId),
    ),
  );

  return withPostgresTransaction(async (client) => {
    for (const ascent of input.create) {
      await client.query(
        `
          insert into ascents (
            athlete_id, date, source, discipline, import_source, route_name, suggested_grade,
            subjective_grade, style, notes
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          ascent.athleteId,
          ascent.date,
          ascent.source,
          ascent.discipline ?? null,
          ascent.importSource ?? null,
          ascent.routeName,
          ascent.suggestedGrade,
          ascent.subjectiveGrade,
          ascent.style ?? null,
          ascent.notes,
        ],
      );
    }

    for (const ascent of input.update) {
      const result = await client.query(
        `
          update ascents
          set date = $2,
            source = $3,
            discipline = $4,
            import_source = $5,
            route_name = $6,
            suggested_grade = $7,
            subjective_grade = $8,
            style = $9,
            notes = $10
          where id = $1
            and athlete_id = $11
            and exists (
              select 1
              from athletes
              where athletes.id = ascents.athlete_id
                and athletes.owner_user_id = $12
            )
        `,
        [
          ascent.id,
          ascent.date,
          ascent.source,
          ascent.discipline ?? null,
          ascent.importSource ?? null,
          ascent.routeName,
          ascent.suggestedGrade,
          ascent.subjectiveGrade,
          ascent.style ?? null,
          ascent.notes,
          ascent.athleteId,
          ownerUserId,
        ],
      );

      if (result.rowCount !== 1) {
        throw new Error("Nie znaleziono przejścia należącego do użytkownika.");
      }
    }

    return {
      createdCount: input.create.length,
      updatedCount: input.update.length,
    };
  });
}

export async function deleteAscentsByImportSourceFromPostgres(
  ownerUserId: string,
  athleteId: string,
  importSource: string,
) {
  await requireOwnedAthlete(ownerUserId, athleteId);
  const result = await queryPostgres(
    `
      delete from ascents
      where athlete_id = $1
        and import_source = $2
    `,
    [athleteId, importSource],
  );

  return result.rowCount ?? 0;
}

export async function updateAscentInPostgres(
  ownerUserId: string,
  input: Required<Pick<AscentRecord, "id">> &
    Omit<AscentRecord, "id" | "createdAt">,
) {
  const result = await queryPostgres<AscentRow>(
    `
    update ascents
    set date = $2,
      source = $3,
      discipline = $4,
      import_source = $5,
      route_name = $6,
      suggested_grade = $7,
      subjective_grade = $8,
      style = $9,
      notes = $10
    where id = $1
      and athlete_id = $11
      and exists (
        select 1
        from athletes
        where athletes.id = ascents.athlete_id
              and athletes.owner_user_id = $12
      )
            returning id, athlete_id, date, source, discipline, import_source, route_name,
      suggested_grade, subjective_grade, style, notes, created_at
  `,
    [
      input.id,
      input.date,
      input.source,
      input.discipline ?? null,
      input.importSource ?? null,
      input.routeName,
      input.suggestedGrade,
      input.subjectiveGrade,
      input.style ?? null,
      input.notes,
      input.athleteId,
      ownerUserId,
    ],
  );

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
  const result = await queryPostgres<{ id: number }>(
    `
    delete from ascents
    where id = $1
      and exists (
        select 1
        from athletes
        where athletes.id = ascents.athlete_id
          and athletes.owner_user_id = $2
      )
    returning id
  `,
    [ascentId, ownerUserId],
  );

  if (!result.rows[0]) {
    throw new Error("Nie znaleziono przejścia należącego do użytkownika.");
  }
}

export async function listSectionsFromPostgres(ownerUserId: string) {
  const result = await queryPostgres<SectionRow>(
    `
    select id, source_id, name, facility_id, created_at
    from sections
    where owner_user_id = $1
    order by created_at asc
  `,
    [ownerUserId],
  );

  return result.rows.map(mapSection);
}

export async function createSectionInPostgres(
  ownerUserId: string,
  name: string,
  facilityId?: string | null,
) {
  const sectionId = crypto.randomUUID();
  const ownedFacilityId = await getOwnedFacilityId(ownerUserId, facilityId);
  const result = await queryPostgres<SectionRow>(
    `
    insert into sections (id, source_id, name, facility_id, owner_user_id)
    values ($1, $1, $2, $3, $4)
    returning id, source_id, name, facility_id, created_at
  `,
    [sectionId, name.trim(), ownedFacilityId, ownerUserId],
  );

  return mapSection(result.rows[0]);
}

export async function updateSectionInPostgres(
  ownerUserId: string,
  sectionId: string,
  name: string,
) {
  const result = await queryPostgres<SectionRow>(
    `
    update sections
    set name = $3
    where id = $1 and owner_user_id = $2
    returning id, source_id, name, facility_id, created_at
  `,
    [sectionId, ownerUserId, name.trim()],
  );

  const section = result.rows[0];
  if (!section)
    throw new Error("Nie znaleziono sekcji należącej do użytkownika.");

  return mapSection(section);
}

export async function deleteSectionFromPostgres(
  ownerUserId: string,
  sectionId: string,
) {
  const result = await queryPostgres<{ id: string }>(
    `
    delete from sections
    where id = $1 and owner_user_id = $2
    returning id
  `,
    [sectionId, ownerUserId],
  );

  if (!result.rows[0]) {
    throw new Error("Nie znaleziono sekcji należącej do użytkownika.");
  }
}

export async function listFacilitiesFromPostgres(ownerUserId: string) {
  const result = await queryPostgres<FacilityRow>(
    `
    select facilities.id, facility_versions.version as current_version,
           facility_versions.name, facility_versions.capabilities, facilities.visibility,
          facilities.owner_user_id as created_by,
           facilities.owner_user_id = $1 as is_owned_by_current_user,
           facility_versions.kind, facility_versions.location_label,
           facility_versions.latitude, facility_versions.longitude, facilities.created_at
    from facilities
    join app_users on app_users.id = facilities.owner_user_id
    join lateral (
      select *
      from facility_versions
      where facility_versions.facility_id = facilities.id
      order by facility_versions.version desc
      limit 1
    ) facility_versions on true
    where facilities.owner_user_id = $1 or facilities.visibility = 'global'
    order by facilities.created_at asc
  `,
    [ownerUserId],
  );

  return result.rows.map(mapFacility);
}

export async function createFacilityInPostgres(
  ownerUserId: string,
  input: Pick<
    FacilityRecord,
    | "name"
    | "capabilities"
    | "kind"
    | "locationLabel"
    | "latitude"
    | "longitude"
  >,
) {
  const facilityId = crypto.randomUUID();
  const result = await queryPostgres<FacilityRow>(
    `
    with inserted_facility as (
      insert into facilities (id, name, capabilities, visibility, kind, location_label, latitude, longitude, owner_user_id)
      values ($1, $2, $3, 'global', $4, $5, $6, $7, $8)
      returning id, visibility, owner_user_id, created_at
    ), inserted_version as (
      insert into facility_versions (
        facility_id, version, name, capabilities, kind, location_label, latitude, longitude
      )
      select id, 1, $2, $3, $4, $5, $6, $7
      from inserted_facility
      returning facility_id, version, name, capabilities, kind, location_label, latitude, longitude
    )
    select inserted_facility.id, inserted_version.version as current_version,
          inserted_version.name, inserted_version.capabilities, inserted_facility.visibility,
          (select display_name from app_users where id = $8) as created_by,
          true as is_owned_by_current_user,
          inserted_version.kind, inserted_version.location_label,
          inserted_version.latitude, inserted_version.longitude, inserted_facility.created_at
    from inserted_facility
    join inserted_version on inserted_version.facility_id = inserted_facility.id
  `,
    [
      facilityId,
      input.name.trim(),
      input.capabilities,
      input.kind,
      input.locationLabel.trim() || null,
      input.latitude,
      input.longitude,
      ownerUserId,
    ],
  );

  return mapFacility(result.rows[0]);
}

export async function updateFacilityInPostgres(
  ownerUserId: string,
  facilityId: string,
  input: Pick<
    FacilityRecord,
    | "name"
    | "capabilities"
    | "kind"
    | "locationLabel"
    | "latitude"
    | "longitude"
  >,
) {
  const result = await queryPostgres<FacilityRow>(
    `
    with owned_facility as (
      select id, visibility, created_at
      from facilities
      where id = $1 and owner_user_id = $2
      for update
    ), inserted_version as (
      insert into facility_versions (
        facility_id, version, name, capabilities, kind, location_label, latitude, longitude
      )
      select owned_facility.id,
        coalesce((
          select max(version)
          from facility_versions
          where facility_id = owned_facility.id
        ), 0) + 1,
        $3, $4, $5, $6, $7, $8
      from owned_facility
      returning facility_id, version, name, capabilities, kind, location_label, latitude, longitude
    )
    select owned_facility.id, inserted_version.version as current_version,
          inserted_version.name, inserted_version.capabilities, owned_facility.visibility,
          (select display_name from app_users where id = $2) as created_by,
          true as is_owned_by_current_user,
          inserted_version.kind, inserted_version.location_label,
          inserted_version.latitude, inserted_version.longitude, owned_facility.created_at
    from owned_facility
    join inserted_version on inserted_version.facility_id = owned_facility.id
  `,
    [
      facilityId,
      ownerUserId,
      input.name.trim(),
      input.capabilities,
      input.kind,
      input.locationLabel.trim() || null,
      input.latitude,
      input.longitude,
    ],
  );

  const facility = result.rows[0];
  if (!facility)
    throw new Error("Nie znaleziono obiektu należącego do użytkownika.");

  return mapFacility(facility);
}

export async function publishFacilityToGlobalInPostgres(
  ownerUserId: string,
  facilityId: string,
) {
  const result = await queryPostgres<FacilityRow>(
    `
    with published_facility as (
      update facilities
      set visibility = 'global'
      where id = $1 and owner_user_id = $2 and visibility = 'private'
      returning id, visibility, created_at
    )
    select published_facility.id, facility_versions.version as current_version,
              facility_versions.name, facility_versions.capabilities, published_facility.visibility,
              (select display_name from app_users where id = $2) as created_by,
              true as is_owned_by_current_user,
              facility_versions.kind, facility_versions.location_label,
              facility_versions.latitude, facility_versions.longitude, published_facility.created_at
    from published_facility
    join lateral (
      select *
      from facility_versions
      where facility_versions.facility_id = published_facility.id
      order by facility_versions.version desc
      limit 1
    ) facility_versions on true
  `,
    [facilityId, ownerUserId],
  );

  const facility = result.rows[0];
  if (!facility) {
    throw new Error(
      "Nie znaleziono prywatnego obiektu należącego do użytkownika.",
    );
  }

  return mapFacility(facility);
}

export async function deleteFacilityFromPostgres(
  ownerUserId: string,
  facilityId: string,
) {
  const result = await queryPostgres<{ id: string }>(
    `
    delete from facilities
    where id = $1 and owner_user_id = $2 and visibility = 'private'
    returning id
  `,
    [facilityId, ownerUserId],
  );

  if (!result.rows[0]) {
    throw new Error(
      "Nie znaleziono prywatnego obiektu należącego do użytkownika.",
    );
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

function normalizeOptionalEmail(value: string | undefined) {
  const email = value ? normalizeEmail(value) : "";
  return email || null;
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
  duplicateStrategy: "skip" | "overwrite" = "skip",
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
    const skipDuplicates = duplicateStrategy === "skip";

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
    const facilityIds = new Map(
      backup.facilities.map((facility) => [
        String(facility.id),
        createOwnerScopedImportId(ownerUserId, "facility", facility.id),
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
      email: string | null;
    }>(
      `
        select id, source_id, name, email
        from athletes
        where owner_user_id = $1
        order by created_at asc
      `,
      [ownerUserId],
    );
    for (const athlete of backup.athletes) {
      const email = normalizeOptionalEmail(athlete.email);
      if (!email) continue;

      const matches = currentAthletes.rows.filter(
        (currentAthlete) =>
          currentAthlete.email &&
          normalizeEmail(currentAthlete.email) === email,
      );
      if (matches.length === 1) {
        athleteIds.set(String(athlete.id), matches[0].id);
      }
    }
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
      (backupOwnerReference === "primary"
        ? currentAthletes.rows[0]
        : undefined);

    if (backupOwner && matchingCurrentAthlete) {
      athleteIds.set(String(backupOwner.id), matchingCurrentAthlete.id);
    }

    const protectedAthleteId = matchingCurrentAthlete?.id ?? null;

    for (const facility of backup.facilities) {
      const facilityId = facilityIds.get(String(facility.id))!;

      await client.query(
        `
          with imported_facility as (
            insert into facilities (
              id, name, capabilities, kind, location_label, latitude, longitude, created_at, owner_user_id
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            on conflict (id) do ${
              skipDuplicates
                ? "nothing"
                : "update set name = excluded.name, capabilities = excluded.capabilities, kind = excluded.kind, location_label = excluded.location_label, latitude = excluded.latitude, longitude = excluded.longitude, created_at = excluded.created_at"
            }
            returning id, name, capabilities, kind, location_label, latitude, longitude, created_at
          )
          insert into facility_versions (
            facility_id, version, name, capabilities, kind, location_label, latitude, longitude, created_at
          )
          select imported_facility.id,
            coalesce((
              select max(version)
              from facility_versions
              where facility_id = imported_facility.id
            ), 0) + 1,
            imported_facility.name, imported_facility.capabilities, imported_facility.kind,
            imported_facility.location_label, imported_facility.latitude, imported_facility.longitude,
            imported_facility.created_at
          from imported_facility
        `,
        [
          facilityId,
          facility.name,
          facility.capabilities ?? { activities: [], ropeWalls: [] },
          facility.kind,
          facility.locationLabel || null,
          facility.latitude,
          facility.longitude,
          facility.createdAt,
          ownerUserId,
        ],
      );
    }

    for (const section of backup.sections) {
      const sectionId = sectionIds.get(String(section.id))!;
      const facilityId = section.facilityId
        ? (facilityIds.get(String(section.facilityId)) ?? null)
        : null;

      await client.query(
        `
          insert into sections (
            id, source_id, name, facility_id, created_at, owner_user_id
          )
          values ($1, $1, $2, $3, $4, $5)
          on conflict (id) do ${
            skipDuplicates
              ? "nothing"
              : "update set name = excluded.name, facility_id = excluded.facility_id, created_at = excluded.created_at"
          }
        `,
        [sectionId, section.name, facilityId, section.createdAt, ownerUserId],
      );
    }

    for (const athlete of backup.athletes) {
      const athleteId = athleteIds.get(String(athlete.id))!;
      const athleteName = getBackupAthleteName(athlete);
      const sectionId = athlete.sectionId
        ? (sectionIds.get(String(athlete.sectionId)) ?? null)
        : null;
      const athleteImportValues = [
        athleteId,
        athleteName,
        athlete.firstName ?? "",
        athlete.lastName ?? "",
        athlete.nick ?? "",
        normalizeOptionalEmail(athlete.email),
        sectionId,
        athlete.createdAt,
        ownerUserId,
        ...(skipDuplicates ? [] : [protectedAthleteId]),
      ];

      await client.query(
        `
          insert into athletes (
            id, source_id, name, first_name, last_name, nick, email, section_id, created_at,
            owner_user_id
          )
          values ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9)
          on conflict (id) do ${
            skipDuplicates
              ? "nothing"
              : "update set name = excluded.name, first_name = excluded.first_name, last_name = excluded.last_name, nick = excluded.nick, email = excluded.email, section_id = excluded.section_id, created_at = excluded.created_at where $10::uuid is null or athletes.id <> $10"
          }
        `,
        athleteImportValues,
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
            difficulty_by_surface, protocol, load_profile, wellbeing, surfaces, facility_name,
            weather_snapshot, rope_wall_name, rope_routes, custom_session_type, notes, created_at
          )
          select
            $1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19, $20, $21
          where not exists (
            select 1
            from trainings
            where athlete_id = $2
              and date = $3
              and time = $4
              and duration_minutes = $5
              and age_years = $6
              and calories_burned = $7
              and attempts_count = $8
              and difficulty_notes = $9
              and difficulty_by_surface is not distinct from $10::jsonb
              and protocol is not distinct from $11::jsonb
              and load_profile is not distinct from $12::jsonb
              and wellbeing = $13
              and surfaces = $14
              and facility_name is not distinct from $15
              and weather_snapshot is not distinct from $16::jsonb
              and rope_wall_name is not distinct from $17
              and rope_routes is not distinct from $18::jsonb
              and custom_session_type is not distinct from $19
              and notes = $20
              and created_at = $21
          )
          on conflict (id) do ${
            skipDuplicates
              ? "nothing"
              : "update set athlete_id = excluded.athlete_id, date = excluded.date, time = excluded.time, duration_minutes = excluded.duration_minutes, age_years = excluded.age_years, calories_burned = excluded.calories_burned, attempts_count = excluded.attempts_count, difficulty_notes = excluded.difficulty_notes, difficulty_by_surface = excluded.difficulty_by_surface, protocol = excluded.protocol, load_profile = excluded.load_profile, wellbeing = excluded.wellbeing, surfaces = excluded.surfaces, facility_name = excluded.facility_name, weather_snapshot = excluded.weather_snapshot, rope_wall_name = excluded.rope_wall_name, rope_routes = excluded.rope_routes, custom_session_type = excluded.custom_session_type, notes = excluded.notes, created_at = excluded.created_at"
          }
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
          training.loadProfile ?? null,
          training.wellbeing,
          training.surfaces,
          training.facilityName ?? null,
          training.weatherSnapshot ?? null,
          training.ropeWallName ?? null,
          training.ropeRoutes ? JSON.stringify(training.ropeRoutes) : null,
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
          on conflict (athlete_id) do ${
            skipDuplicates
              ? "nothing"
              : "update set birth_date = excluded.birth_date, sex = excluded.sex, height_cm = excluded.height_cm, weight_kg = excluded.weight_kg, updated_at = excluded.updated_at"
          }
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
            athlete_id, date, source, discipline, import_source, route_name, suggested_grade,
            subjective_grade, style, notes, created_at
          )
          select $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
          where not exists (
            select 1
            from ascents
            where athlete_id = $1
              and date = $2
              and source = $3
              and discipline is not distinct from $4
              and import_source is not distinct from $5
              and route_name = $6
              and suggested_grade = $7
              and subjective_grade = $8
              and style is not distinct from $9
              and notes = $10
              and created_at = $11
          )
        `,
        [
          getMappedAthleteId(athleteIds, ascent.athleteId),
          ascent.date,
          ascent.source,
          ascent.discipline ?? null,
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
