import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.EXPERIMENTAL_API_BASE_URL;

if (!baseUrl) {
  throw new Error(
    "EXPERIMENTAL_API_BASE_URL jest wymagane, aby uruchomić test API PostgreSQL.",
  );
}

const base = baseUrl.replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const body = await response.json();

  return { response, body };
}

function actorHeaders(userId) {
  return { "X-Climberbook-User-Id": userId };
}

async function createUser(label) {
  const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const { response, body } = await request("/api/v1/users", {
    method: "POST",
    body: JSON.stringify({
      email: `${label}-${suffix}@example.test`,
      displayName: `${label} test`,
    }),
  });

  assert.equal(response.status, 201, body.error);
  return body.user;
}

test("eksperymentalne API izoluje dane użytkowników i obsługuje pełny przepływ danych", async () => {
  const health = await request("/api/db/health");
  assert.equal(
    health.response.status,
    200,
    `Endpoint bazy nie jest gotowy: ${health.body.error ?? health.response.status}`,
  );

  const owner = await createUser("owner");
  const otherUser = await createUser("other");
  const ownerHeaders = actorHeaders(owner.id);
  const otherHeaders = actorHeaders(otherUser.id);

  const { body: sectionBody, response: sectionResponse } = await request(
    "/api/v1/sections",
    {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({ name: "Sekcja testowa" }),
    },
  );
  assert.equal(sectionResponse.status, 201, sectionBody.error);

  const { body: facilityBody, response: facilityResponse } = await request(
    "/api/v1/facilities",
    {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({ name: "Obiekt testowy" }),
    },
  );
  assert.equal(facilityResponse.status, 201, facilityBody.error);

  const { body: athleteBody, response: athleteResponse } = await request(
    "/api/v1/athletes",
    {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({
        firstName: "Ala",
        lastName: "Testowa",
        sectionId: sectionBody.section.id,
      }),
    },
  );
  assert.equal(athleteResponse.status, 201, athleteBody.error);
  const athleteId = athleteBody.athlete.id;

  const profile = await request("/api/v1/profiles", {
    method: "PUT",
    headers: ownerHeaders,
    body: JSON.stringify({
      athleteId,
      birthDate: "1990-01-01",
      sex: "kobieta",
      heightCm: 170,
      weightKg: 60,
    }),
  });
  assert.equal(profile.response.status, 200, profile.body.error);

  const weight = await request("/api/v1/weight-entries", {
    method: "POST",
    headers: ownerHeaders,
    body: JSON.stringify({
      athleteId,
      date: "2026-07-23",
      time: "09:00",
      weightKg: 60,
    }),
  });
  assert.equal(weight.response.status, 201, weight.body.error);

  const ascent = await request("/api/v1/ascents", {
    method: "POST",
    headers: ownerHeaders,
    body: JSON.stringify({
      athleteId,
      date: "2026-07-23",
      source: "panel",
      routeName: "Projekt testowy",
      suggestedGrade: "6a",
      subjectiveGrade: "6a",
      notes: "",
    }),
  });
  assert.equal(ascent.response.status, 201, ascent.body.error);

  const climb = await request("/api/v1/climbs", {
    method: "POST",
    headers: ownerHeaders,
    body: JSON.stringify({ athleteId, name: "Katalog testowy", grade: "6a" }),
  });
  assert.equal(climb.response.status, 201, climb.body.error);

  const training = await request("/api/v1/trainings", {
    method: "POST",
    headers: ownerHeaders,
    body: JSON.stringify({
      athleteId,
      date: "2026-07-23",
      time: "19:00",
      durationMinutes: 90,
      ageYears: 36,
      caloriesBurned: 500,
      attemptsCount: 0,
      difficultyNotes: "6a",
      difficultyBySurface: { baldy: "6a" },
      wellbeing: "dobrze",
      surfaces: ["baldy"],
      facilityName: facilityBody.facility.name,
      notes: "",
    }),
  });
  assert.equal(training.response.status, 201, training.body.error);

  const snapshot = await request("/api/v1/snapshot", {
    headers: ownerHeaders,
  });
  assert.equal(snapshot.response.status, 200, snapshot.body.error);
  assert.equal(snapshot.body.athletes.length, 1);
  assert.equal(snapshot.body.trainings.length, 1);
  assert.equal(snapshot.body.weightEntries.length, 1);
  assert.equal(snapshot.body.ascents.length, 1);
  assert.equal(snapshot.body.climbs.length, 1);
  assert.equal(snapshot.body.sections.length, 1);
  assert.equal(snapshot.body.facilities.length, 1);

  const isolatedSnapshot = await request("/api/v1/snapshot", {
    headers: otherHeaders,
  });
  assert.equal(isolatedSnapshot.response.status, 200, isolatedSnapshot.body.error);
  assert.deepEqual(isolatedSnapshot.body.athletes, []);
  assert.deepEqual(isolatedSnapshot.body.trainings, []);
  assert.deepEqual(isolatedSnapshot.body.weightEntries, []);
  assert.deepEqual(isolatedSnapshot.body.ascents, []);
  assert.deepEqual(isolatedSnapshot.body.climbs, []);

  for (const path of [
    `/api/v1/trainings?id=${training.body.training.id}`,
    `/api/v1/climbs?id=${climb.body.climb.id}`,
    `/api/v1/ascents?id=${ascent.body.ascent.id}`,
    `/api/v1/weight-entries?id=${weight.body.weightEntry.id}`,
    `/api/v1/athletes?id=${athleteId}`,
    `/api/v1/facilities?id=${facilityBody.facility.id}`,
    `/api/v1/sections?id=${sectionBody.section.id}`,
  ]) {
    const cleanup = await request(path, {
      method: "DELETE",
      headers: ownerHeaders,
    });
    assert.equal(cleanup.response.status, 200, cleanup.body.error);
  }
});