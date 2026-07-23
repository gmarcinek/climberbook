import type {
  AscentRecord,
  AthleteInput,
  AthleteRecord,
  ClimberbookFullDatabaseBackup,
  ClimbRecord,
  FacilityRecord,
  SectionRecord,
  TrainingRecord,
  UserProfileRecord,
  WeightEntryRecord,
} from "@/lib/climbs-db";

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

const testUserId = process.env.NEXT_PUBLIC_EXPERIMENTAL_POSTGRES_USER_ID?.trim();

export function isExperimentalPostgresUiEnabled() {
  return process.env.NEXT_PUBLIC_EXPERIMENTAL_POSTGRES_UI === "true";
}

async function request<T>(path: string, options: RequestInit = {}) {
  if (!isExperimentalPostgresUiEnabled()) {
    throw new Error("Eksperymentalny tryb PostgreSQL UI nie jest skonfigurowany.");
  }

  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(testUserId ? { "X-Climberbook-User-Id": testUserId } : {}),
      ...options.headers,
    },
  });
  const body: unknown = await response.json();

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String(body.error)
        : "Żądanie do eksperymentalnego API PostgreSQL nie powiodło się.";
    throw new Error(message);
  }

  return body as T;
}

export function getExperimentalPostgresSnapshot() {
  return request<PostgresSnapshot>("/api/v1/snapshot");
}

export function deleteExperimentalAccount() {
  return request("/api/v1/account", { method: "DELETE" });
}

export function importExperimentalPostgresBackup(
  backup: ClimberbookFullDatabaseBackup,
) {
  return request("/api/v1/backups/import", {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
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
  if (input.id === undefined) {
    throw new Error("Aktualizacja wpisu wagi wymaga identyfikatora.");
  }
  const response = await request<{ weightEntry: WeightEntryRecord }>(
    "/api/v1/weight-entries",
    { method: "PATCH", body: JSON.stringify(input) },
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

export async function createExperimentalSection(name: string) {
  const response = await request<{ section: SectionRecord }>(
    "/api/v1/sections",
    { method: "POST", body: JSON.stringify({ name }) },
  );
  return response.section;
}

export function deleteExperimentalSection(id: string) {
  return request("/api/v1/sections?id=" + encodeURIComponent(id), {
    method: "DELETE",
  });
}

export async function createExperimentalFacility(name: string) {
  const response = await request<{ facility: FacilityRecord }>(
    "/api/v1/facilities",
    { method: "POST", body: JSON.stringify({ name }) },
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