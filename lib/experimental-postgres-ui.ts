import type {
  AscentRecord,
  AthleteExportOptions,
  AthleteInput,
  AthleteRecord,
  ClimberbookFullDatabaseBackup,
  ClimbRecord,
  FacilityRecord,
  FullDatabaseImportOptions,
  FullDatabaseExportOptions,
  SectionRecord,
  TrainingRecord,
  UserProfileRecord,
  WeightEntryRecord,
} from "@/lib/climbs-db";
import { createTrainingExportMetadata } from "@/lib/climbs-db";

type PostgresSnapshot = {
  athletes: AthleteRecord[];
  sections: SectionRecord[];
  facilities: FacilityRecord[];
  climbs: ClimbRecord[];
  trainings: TrainingRecord[];
  ascents: AscentRecord[];
  profiles: UserProfileRecord[];
  weightEntries: WeightEntryRecord[];
};

const testUserId =
  process.env.NEXT_PUBLIC_EXPERIMENTAL_POSTGRES_USER_ID?.trim();
export const EXPERIMENTAL_API_PENDING_EVENT = "climberbook:api-pending";

export class ExperimentalApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ExperimentalApiError";
  }
}

function notifyExperimentalApiPending(change: 1 | -1) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<number>(EXPERIMENTAL_API_PENDING_EVENT, {
      detail: change,
    }),
  );
}

export function isExperimentalPostgresUiEnabled() {
  return true;
}

async function request<T>(path: string, options: RequestInit = {}) {
  if (!isExperimentalPostgresUiEnabled()) {
    throw new Error(
      "Eksperymentalny tryb PostgreSQL UI nie jest skonfigurowany.",
    );
  }

  notifyExperimentalApiPending(1);
  try {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(testUserId ? { "X-Climberbook-User-Id": testUserId } : {}),
        ...options.headers,
      },
    });
    const responseText = await response.text();
    let body: unknown = null;

    if (responseText) {
      try {
        body = JSON.parse(responseText);
      } catch {
        body = null;
      }
    }

    if (!response.ok) {
      const message =
        body && typeof body === "object" && "error" in body
          ? String(body.error)
          : `Żądanie do eksperymentalnego API PostgreSQL nie powiodło się (HTTP ${response.status}).`;
      throw new ExperimentalApiError(message, response.status);
    }

    return body as T;
  } finally {
    notifyExperimentalApiPending(-1);
  }
}

export function getExperimentalPostgresSnapshot(chartRange?: {
  start: string;
  end: string;
}) {
  const search = chartRange
    ? `?${new URLSearchParams(chartRange).toString()}`
    : "";

  return request<PostgresSnapshot>(`/api/v1/snapshot${search}`);
}

export function deleteExperimentalAccount() {
  return request("/api/v1/account", { method: "DELETE" });
}

export async function exportExperimentalPostgresBackup(
  options?: FullDatabaseExportOptions,
) {
  const backup = await request<ClimberbookFullDatabaseBackup>(
    "/api/v1/backups/export",
  );

  if (!options) return backup;

  const athleteIds = new Set(options.athleteIds);
  athleteIds.add(backup.ownerAthleteId);
  const athletes = backup.athletes
    .filter((athlete) => athleteIds.has(athlete.id))
    .map((athlete) =>
      options.sections ? athlete : { ...athlete, sectionId: null },
    );
  const sectionIds = new Set(
    athletes.flatMap((athlete) =>
      athlete.sectionId ? [athlete.sectionId] : [],
    ),
  );
  const sections = options.sections
    ? backup.sections.filter((section) => sectionIds.has(section.id))
    : [];
  const facilityIds = new Set(
    sections.flatMap((section) =>
      section.facilityId ? [section.facilityId] : [],
    ),
  );
  const trainings = options.trainings
    ? backup.trainings.filter((training) => athleteIds.has(training.athleteId))
    : [];

  return {
    ...backup,
    ...createTrainingExportMetadata(trainings),
    athletes,
    sections: options.sections
      ? sections.map((section) =>
          options.facilities ? section : { ...section, facilityId: null },
        )
      : [],
    facilities: options.facilities
      ? backup.facilities.filter((facility) => facilityIds.has(facility.id))
      : [],
    climbs: options.climbs
      ? backup.climbs.filter((climb) => athleteIds.has(climb.athleteId))
      : [],
    trainings,
    ascents: options.ascents
      ? backup.ascents.filter((ascent) => athleteIds.has(ascent.athleteId))
      : [],
    profiles: options.profiles
      ? backup.profiles.filter((profile) => athleteIds.has(profile.athleteId))
      : [],
    weightEntries: options.weightEntries
      ? backup.weightEntries.filter((entry) => athleteIds.has(entry.athleteId))
      : [],
  };
}

export async function exportExperimentalAthleteBackup(
  athleteId: string,
  options: AthleteExportOptions,
) {
  const backup = await exportExperimentalPostgresBackup();
  const athlete = backup.athletes.find(
    (candidate) => candidate.id === athleteId,
  );

  if (!athlete) {
    throw new Error("Nie znaleziono zawodnika do eksportu.");
  }

  const trainings = options.trainings
    ? backup.trainings.filter((training) => training.athleteId === athleteId)
    : [];
  const exportedAthlete = options.sections
    ? athlete
    : { ...athlete, sectionId: null };

  return {
    ...backup,
    ...createTrainingExportMetadata(trainings),
    ownerAthleteId: athleteId,
    athletes: [exportedAthlete],
    sections:
      options.sections && athlete.sectionId
        ? backup.sections.filter((section) => section.id === athlete.sectionId)
        : [],
    facilities: options.facilities ? backup.facilities : [],
    climbs: options.climbs
      ? backup.climbs.filter((climb) => climb.athleteId === athleteId)
      : [],
    trainings,
    ascents: options.ascents
      ? backup.ascents.filter((ascent) => ascent.athleteId === athleteId)
      : [],
    profiles: options.profile
      ? backup.profiles.filter((profile) => profile.athleteId === athleteId)
      : [],
    weightEntries: options.weightEntries
      ? backup.weightEntries.filter(
          (weightEntry) => weightEntry.athleteId === athleteId,
        )
      : [],
  };
}

export function prepareExperimentalPostgresBackupImport(
  backup: ClimberbookFullDatabaseBackup,
  options: FullDatabaseImportOptions,
) {
  const athleteIds = new Set(options.athleteIds);
  const athletes = backup.athletes
    .filter((athlete) => athleteIds.has(athlete.id))
    .map((athlete) =>
      options.sections ? athlete : { ...athlete, sectionId: null },
    );
  const sectionIds = new Set(
    athletes.flatMap((athlete) =>
      athlete.sectionId ? [athlete.sectionId] : [],
    ),
  );
  const sections = options.sections
    ? backup.sections.filter((section) => sectionIds.has(section.id))
    : [];
  const facilityIds = new Set(
    sections.flatMap((section) =>
      section.facilityId ? [section.facilityId] : [],
    ),
  );
  const facilities = options.facilities
    ? backup.facilities.filter((facility) => facilityIds.has(facility.id))
    : [];
  const trainings = options.trainings
    ? backup.trainings.filter((training) => athleteIds.has(training.athleteId))
    : [];

  return {
    ...backup,
    ...createTrainingExportMetadata(trainings),
    ownerAthleteId: athleteIds.has(backup.ownerAthleteId)
      ? backup.ownerAthleteId
      : (athletes[0]?.id ?? backup.ownerAthleteId),
    athletes,
    sections: options.facilities
      ? sections
      : sections.map((section) => ({ ...section, facilityId: null })),
    facilities,
    climbs: options.climbs
      ? backup.climbs.filter((climb) => athleteIds.has(climb.athleteId))
      : [],
    trainings,
    ascents: options.ascents
      ? backup.ascents.filter((ascent) => athleteIds.has(ascent.athleteId))
      : [],
    profiles: options.profiles
      ? backup.profiles.filter((profile) => athleteIds.has(profile.athleteId))
      : [],
    weightEntries: options.weightEntries
      ? backup.weightEntries.filter((entry) => athleteIds.has(entry.athleteId))
      : [],
  };
}

export function importExperimentalPostgresBackup(
  backup: ClimberbookFullDatabaseBackup,
  allowDifferentOwnerEmail = false,
  duplicateStrategy: "skip" | "overwrite" = "skip",
) {
  return request("/api/v1/backups/import", {
    method: "POST",
    headers: {
      "Idempotency-Key": crypto.randomUUID(),
      ...(allowDifferentOwnerEmail
        ? { "X-Climberbook-Confirm-Different-Owner-Email": "true" }
        : {}),
      "X-Climberbook-Duplicate-Strategy": duplicateStrategy,
    },
    body: JSON.stringify(backup),
  });
}

export async function createExperimentalTraining(
  input: Omit<TrainingRecord, "id" | "createdAt">,
) {
  const response = await request<{ training: TrainingRecord }>(
    "/api/v1/trainings",
    { method: "POST", body: JSON.stringify(input) },
  );
  return response.training;
}

export async function updateExperimentalTraining(
  input: Omit<TrainingRecord, "createdAt">,
) {
  const response = await request<{ training: TrainingRecord }>(
    "/api/v1/trainings",
    { method: "PATCH", body: JSON.stringify(input) },
  );
  return response.training;
}

export function deleteExperimentalTraining(id: string) {
  return request("/api/v1/trainings?id=" + encodeURIComponent(id), {
    method: "DELETE",
  });
}

export async function createExperimentalWeightEntry(
  input: Omit<WeightEntryRecord, "id" | "createdAt">,
) {
  const response = await request<{ weightEntry: WeightEntryRecord }>(
    "/api/v1/weight-entries",
    { method: "POST", body: JSON.stringify(input) },
  );
  return response.weightEntry;
}

export async function updateExperimentalWeightEntryRecord(
  input: WeightEntryRecord,
) {
  const id = Number(input.id);
  const weightKg = Number(input.weightKg);
  if (!Number.isInteger(id) || id < 1) {
    throw new Error("Aktualizacja wpisu wagi wymaga identyfikatora.");
  }
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new Error("Aktualizacja wpisu wagi wymaga dodatniej wagi.");
  }
  const response = await request<{ weightEntry: WeightEntryRecord }>(
    "/api/v1/weight-entries",
    {
      method: "PATCH",
      body: JSON.stringify({
        id,
        athleteId: input.athleteId,
        date: input.date,
        time: input.time,
        weightKg,
      }),
    },
  );
  return response.weightEntry;
}

export function deleteExperimentalWeightEntry(id: number) {
  return request("/api/v1/weight-entries?id=" + id, { method: "DELETE" });
}

export async function createExperimentalAscent(
  input: Omit<AscentRecord, "id" | "createdAt">,
) {
  const response = await request<{ ascent: AscentRecord }>("/api/v1/ascents", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.ascent;
}

export function importExperimentalAscents(input: {
  create: Array<Omit<AscentRecord, "id" | "createdAt">>;
  update: Array<
    Required<Pick<AscentRecord, "id">> & Omit<AscentRecord, "id" | "createdAt">
  >;
}) {
  return request<{ createdCount: number; updatedCount: number }>(
    "/api/v1/ascents/import",
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function deleteExperimental8aNuAscents(athleteId: string) {
  return request<{ deletedCount: number }>(
    "/api/v1/ascents/import?athleteId=" + encodeURIComponent(athleteId),
    { method: "DELETE" },
  );
}

export async function updateExperimentalAscent(
  input: Required<Pick<AscentRecord, "id">> &
    Omit<AscentRecord, "id" | "createdAt">,
) {
  const response = await request<{ ascent: AscentRecord }>("/api/v1/ascents", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return response.ascent;
}

export async function saveExperimentalProfile(
  input: Omit<UserProfileRecord, "key" | "updatedAt">,
) {
  const response = await request<{ profile: UserProfileRecord }>(
    "/api/v1/profiles",
    { method: "PUT", body: JSON.stringify(input) },
  );
  return response.profile;
}

export async function createExperimentalAthlete(input: AthleteInput) {
  const response = await request<{ athlete: AthleteRecord }>(
    "/api/v1/athletes",
    { method: "POST", body: JSON.stringify(input) },
  );
  return response.athlete;
}

export async function updateExperimentalAthlete(
  id: string,
  input: AthleteInput,
) {
  const response = await request<{ athlete: AthleteRecord }>(
    "/api/v1/athletes",
    { method: "PATCH", body: JSON.stringify({ id, ...input }) },
  );
  return response.athlete;
}

export function deleteExperimentalAthlete(id: string) {
  return request("/api/v1/athletes?id=" + encodeURIComponent(id), {
    method: "DELETE",
  });
}

export async function createExperimentalSection(
  name: string,
  facilityId?: string | null,
) {
  const response = await request<{ section: SectionRecord }>(
    "/api/v1/sections",
    { method: "POST", body: JSON.stringify({ name, facilityId }) },
  );
  return response.section;
}

export async function updateExperimentalSection(id: string, name: string) {
  const response = await request<{ section: SectionRecord }>(
    "/api/v1/sections",
    { method: "PATCH", body: JSON.stringify({ id, name }) },
  );
  return response.section;
}

export function deleteExperimentalSection(id: string) {
  return request("/api/v1/sections?id=" + encodeURIComponent(id), {
    method: "DELETE",
  });
}

export async function createExperimentalFacility(
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
  const response = await request<{ facility: FacilityRecord }>(
    "/api/v1/facilities",
    { method: "POST", body: JSON.stringify(input) },
  );
  return response.facility;
}

export async function updateExperimentalFacility(
  id: string,
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
  const response = await request<{ facility: FacilityRecord }>(
    "/api/v1/facilities",
    { method: "PATCH", body: JSON.stringify({ id, ...input }) },
  );
  return response.facility;
}

export async function publishExperimentalFacility(id: string) {
  const response = await request<{ facility: FacilityRecord }>(
    "/api/v1/facilities",
    { method: "PATCH", body: JSON.stringify({ id, publish: true }) },
  );
  return response.facility;
}

export function deleteExperimentalFacility(id: string) {
  return request("/api/v1/facilities?id=" + encodeURIComponent(id), {
    method: "DELETE",
  });
}

export async function assignExperimentalAthleteToSection(
  id: string,
  sectionId: string | null,
) {
  const response = await request<{ athlete: AthleteRecord }>(
    "/api/v1/athletes",
    { method: "PATCH", body: JSON.stringify({ id, sectionId }) },
  );
  return response.athlete;
}
