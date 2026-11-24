import type { CalendarEvent } from "@/components/alternating-care/source/api/db/types";
import { randomUUID } from "node:crypto";
import { queryPostgres, withPostgresTransaction } from "@/lib/server/postgres";
import type { PoolClient } from "pg";

type CareRangeRow = {
  id: string;
  group_id: string;
  start_date: string;
  end_date: string;
  event_type: CalendarEvent["type"];
  issuer: string;
  name: string;
  description: string;
  style: CalendarEvent["style"] | null;
  created_at: Date;
  updated_at: Date;
};

type StoredEvent = Pick<
  CalendarEvent,
  "groupId" | "type" | "issuer" | "name" | "description" | "style"
> & { date: string };

export class CareEventValidationError extends Error {}

function isoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function addDays(value: string, amount: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
}

function normalizeEvents(input: unknown) {
  if (!input || typeof input !== "object") {
    throw new CareEventValidationError("Brakuje danych wydarzeń.");
  }
  const value = input as Record<string, unknown>;
  if (!Array.isArray(value.events) || value.events.length === 0) {
    throw new CareEventValidationError("Lista wydarzeń jest pusta.");
  }

  return value.events.map((candidate): StoredEvent => {
    if (!candidate || typeof candidate !== "object") {
      throw new CareEventValidationError("Nieprawidłowe wydarzenie.");
    }
    const event = candidate as Record<string, unknown>;
    if (!isoDate(event.date)) {
      throw new CareEventValidationError("Nieprawidłowa data wydarzenia.");
    }
    if (typeof event.groupId !== "string" || !event.groupId.trim()) {
      throw new CareEventValidationError("Brakuje identyfikatora grupy.");
    }
    if (typeof event.type !== "string" || !event.type.trim()) {
      throw new CareEventValidationError("Brakuje rodzaju wydarzenia.");
    }

    const styleValue =
      event.style && typeof event.style === "object"
        ? (event.style as Record<string, unknown>)
        : null;
    const style =
      typeof styleValue?.background === "string" &&
      typeof styleValue.color === "string"
        ? {
            background: styleValue.background,
            color: styleValue.color,
          }
        : undefined;

    return {
      date: event.date,
      groupId: event.groupId.trim(),
      type: event.type.trim() as CalendarEvent["type"],
      issuer:
        typeof event.issuer === "string" && event.issuer.trim()
          ? event.issuer.trim()
          : "Admin",
      name: typeof event.name === "string" ? event.name.trim() : "",
      description:
        typeof event.description === "string"
          ? event.description.trim().slice(0, 4000)
          : "",
      style,
    };
  });
}

function projectRow(row: CareRangeRow): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (
    let date = row.start_date;
    date < row.end_date;
    date = addDays(date, 1)
  ) {
    events.push({
      id: `${row.id}:${date}`,
      groupId: row.group_id,
      date,
      type: row.event_type,
      issuer: "remote",
      name: row.name,
      description: row.description,
      style: row.style ?? undefined,
      creationTime: row.created_at.getTime(),
      unsynced: false,
      lastEditTime: row.updated_at.getTime(),
    });
  }
  return events;
}

function rowsForEvents(events: StoredEvent[]) {
  const uniqueEvents = new Map<string, StoredEvent>();
  for (const event of events) {
    uniqueEvents.set(`${event.groupId}\0${event.date}`, event);
  }
  const sorted = [...uniqueEvents.values()].sort((left, right) => {
    return (
      left.groupId.localeCompare(right.groupId) ||
      left.type.localeCompare(right.type) ||
      left.date.localeCompare(right.date)
    );
  });
  const ranges: Array<StoredEvent & { endDate: string }> = [];

  for (const event of sorted) {
    const previous = ranges[ranges.length - 1];
    if (
      previous &&
      previous.groupId === event.groupId &&
      previous.type === event.type &&
      previous.issuer === event.issuer &&
      previous.name === event.name &&
      previous.description === event.description &&
      JSON.stringify(previous.style ?? null) ===
        JSON.stringify(event.style ?? null) &&
      previous.endDate === event.date
    ) {
      previous.endDate = addDays(event.date, 1);
    } else {
      ranges.push({ ...event, endDate: addDays(event.date, 1) });
    }
  }

  return ranges;
}

async function listRangeRows(
  client: PoolClient | null,
  ownerUserId: string,
  groupId?: string,
  eventType?: string,
  rangeStart?: string,
  rangeEnd?: string,
) {
  const query = `
    select id, group_id, start_date, end_date, event_type, issuer, name,
      description, style, created_at, updated_at
    from care_event_ranges
    where owner_user_id = $1
      and ($2::text is null or group_id = $2)
      and ($3::text is null or event_type = $3)
      and ($4::date is null or start_date <= $4::date)
      and ($5::date is null or end_date >= $5::date)
    order by start_date, group_id, created_at
  `;
  const params = [
    ownerUserId,
    groupId ?? null,
    eventType ?? null,
    rangeEnd ?? null,
    rangeStart ?? null,
  ];
  const result = client
    ? await client.query<CareRangeRow>(query, params)
    : await queryPostgres<CareRangeRow>(query, params);
  return result.rows;
}

export async function listCareEvents(
  ownerUserId: string,
  groupId?: string,
  eventType?: string,
  rangeStart?: string,
  rangeEnd?: string,
) {
  const rows = await listRangeRows(
    null,
    ownerUserId,
    groupId,
    eventType,
    rangeStart,
    rangeEnd,
  );
  return rows.flatMap(projectRow);
}

export async function createCareEventsFromProjection(
  ownerUserId: string,
  input: unknown,
) {
  const events = normalizeEvents(input);
  const ranges = rowsForEvents(events);

  await withPostgresTransaction(async (client) => {
    const groupIds = [...new Set(ranges.map((range) => range.groupId))];
    for (const groupId of groupIds) {
      await client.query(
        "delete from care_event_ranges where owner_user_id = $1 and group_id = $2",
        [ownerUserId, groupId],
      );
    }

    for (const range of ranges) {
      await client.query(
        `
          insert into care_event_ranges (
            id, owner_user_id, group_id, start_date, end_date, event_type,
            issuer, name, description, style
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          randomUUID(),
          ownerUserId,
          range.groupId,
          range.date,
          range.endDate,
          range.type,
          range.issuer,
          range.name,
          range.description,
          range.style ?? {},
        ],
      );
    }
  });

  return listCareEvents(ownerUserId);
}

export async function toggleCareEventDates(
  ownerUserId: string,
  input: unknown,
) {
  if (!input || typeof input !== "object") {
    throw new CareEventValidationError("Brakuje danych zakresu.");
  }
  const candidate = input as Record<string, unknown>;
  if (
    typeof candidate.groupId !== "string" ||
    !candidate.groupId.trim() ||
    !Array.isArray(candidate.dates)
  ) {
    throw new CareEventValidationError("Brakuje grupy lub dat.");
  }
  const groupId = candidate.groupId.trim();
  const selectedDates = candidate.dates.filter(isoDate);
  if (selectedDates.length !== candidate.dates.length) {
    throw new CareEventValidationError("Nieprawidłowa data.");
  }

  await withPostgresTransaction(async (client) => {
    const rows = await listRangeRows(client, ownerUserId, groupId);
    const projected = rows.flatMap(projectRow);
    const currentDates = new Set(projected.map((event) => event.date));
    const template = projected[0] ?? {
      groupId,
      date: selectedDates[0],
      type: groupId as CalendarEvent["type"],
      issuer: "Admin",
      name: groupId === "ALTERNATING" ? "ALTERNATING" : "",
      description: "",
      style: undefined,
    };

    for (const date of selectedDates) {
      if (currentDates.has(date)) currentDates.delete(date);
      else currentDates.add(date);
    }

    await client.query(
      "delete from care_event_ranges where owner_user_id = $1 and group_id = $2",
      [ownerUserId, groupId],
    );

    const replacement = rowsForEvents(
      [...currentDates].sort().map((date) => ({
        ...template,
        date,
        groupId,
      })),
    );
    for (const range of replacement) {
      await client.query(
        `
          insert into care_event_ranges (
            id, owner_user_id, group_id, start_date, end_date, event_type,
            issuer, name, description, style
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          randomUUID(),
          ownerUserId,
          groupId,
          range.date,
          range.endDate,
          range.type,
          range.issuer === "remote" ? "Admin" : range.issuer,
          range.name ?? "",
          range.description ?? "",
          range.style ?? {},
        ],
      );
    }
  });

  return listCareEvents(ownerUserId, groupId);
}

export async function deleteProjectedCareEvent(
  ownerUserId: string,
  id: string,
  date: string,
) {
  const [rangeId] = id.split(":");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      rangeId,
    ) ||
    !isoDate(date)
  ) {
    throw new CareEventValidationError("Nieprawidłowy identyfikator wpisu.");
  }

  await withPostgresTransaction(async (client) => {
    const result = await client.query<CareRangeRow>(
      `
        select id, group_id, start_date, end_date, event_type, issuer, name,
          description, style, created_at, updated_at
        from care_event_ranges
        where owner_user_id = $1 and id = $2
          and start_date <= $3::date and end_date > $3::date
        for update
      `,
      [ownerUserId, rangeId, date],
    );
    const row = result.rows[0];
    if (!row) {
      throw new CareEventValidationError("Nie znaleziono wydarzenia.");
    }

    await client.query("delete from care_event_ranges where id = $1", [rangeId]);
    if (row.start_date < date) {
      await client.query(
        `
          insert into care_event_ranges (
            id, owner_user_id, group_id, start_date, end_date, event_type,
            issuer, name, description, style, created_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          randomUUID(),
          ownerUserId,
          row.group_id,
          row.start_date,
          date,
          row.event_type,
          row.issuer,
          row.name,
          row.description,
          row.style ?? {},
          row.created_at,
        ],
      );
    }
    const nextDate = addDays(date, 1);
    if (nextDate < row.end_date) {
      await client.query(
        `
          insert into care_event_ranges (
            id, owner_user_id, group_id, start_date, end_date, event_type,
            issuer, name, description, style, created_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          randomUUID(),
          ownerUserId,
          row.group_id,
          nextDate,
          row.end_date,
          row.event_type,
          row.issuer,
          row.name,
          row.description,
          row.style ?? {},
          row.created_at,
        ],
      );
    }
  });
}

const CARE_GROUP_PATTERN = /^CARE:\S{1,250}$/;

// Sets one caregiver per date: every care range (legacy ALTERNATING or
// CARE:*) covering a given date is cut around it before the new days are
// inserted, so each day ends up with exactly one caregiver.
export async function assignCareDates(ownerUserId: string, input: unknown) {
  if (!input || typeof input !== "object") {
    throw new CareEventValidationError("Brakuje danych przypisania.");
  }
  const candidate = input as Record<string, unknown>;
  if (!Array.isArray(candidate.assignments) || !candidate.assignments.length) {
    throw new CareEventValidationError("Lista dni jest pusta.");
  }
  if (candidate.assignments.length > 3660) {
    throw new CareEventValidationError("Za dużo dni w jednym zapisie.");
  }

  const byDate = new Map<string, StoredEvent>();
  for (const item of candidate.assignments) {
    const entry =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    if (!isoDate(entry.date)) {
      throw new CareEventValidationError("Nieprawidłowa data.");
    }
    if (
      typeof entry.groupId !== "string" ||
      !CARE_GROUP_PATTERN.test(entry.groupId)
    ) {
      throw new CareEventValidationError("Nieprawidłowy opiekun.");
    }
    const styleValue =
      entry.style && typeof entry.style === "object"
        ? (entry.style as Record<string, unknown>)
        : null;
    byDate.set(entry.date, {
      date: entry.date,
      groupId: entry.groupId,
      type: "ALTERNATING" as CalendarEvent["type"],
      issuer: entry.groupId.slice("CARE:".length),
      name: entry.groupId.slice("CARE:".length),
      description: "",
      style:
        typeof styleValue?.background === "string" &&
        typeof styleValue.color === "string"
          ? { background: styleValue.background, color: styleValue.color }
          : undefined,
    });
  }

  const dates = [...byDate.keys()].sort();
  const blocks: Array<{ start: string; endExclusive: string }> = [];
  for (const date of dates) {
    const previous = blocks[blocks.length - 1];
    if (previous && previous.endExclusive === date) {
      previous.endExclusive = addDays(date, 1);
    } else {
      blocks.push({ start: date, endExclusive: addDays(date, 1) });
    }
  }

  await withPostgresTransaction(async (client) => {
    for (const block of blocks) {
      await cutCareRanges(client, ownerUserId, block.start, block.endExclusive);
    }

    for (const range of rowsForEvents([...byDate.values()])) {
      await client.query(
        `
          insert into care_event_ranges (
            id, owner_user_id, group_id, start_date, end_date, event_type,
            issuer, name, description, style
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          randomUUID(),
          ownerUserId,
          range.groupId,
          range.date,
          range.endDate,
          range.type,
          range.issuer,
          range.name ?? "",
          range.description ?? "",
          range.style ?? {},
        ],
      );
    }
  });

  return listCareEvents(ownerUserId, undefined, "ALTERNATING", dates[0], dates[dates.length - 1]);
}

// Removes care (self and caregivers) on [start, endExclusive), keeping the
// parts of overlapping ranges that fall outside it.
async function cutCareRanges(
  client: PoolClient,
  ownerUserId: string,
  start: string,
  endExclusive: string,
) {
  const overlaps = await client.query<CareRangeRow>(
    `
      select id, group_id, start_date, end_date, event_type, issuer, name,
        description, style, created_at, updated_at
      from care_event_ranges
      where owner_user_id = $1
        and (group_id = 'ALTERNATING' or group_id like 'CARE:%')
        and start_date < $3::date
        and end_date > $2::date
      for update
    `,
    [ownerUserId, start, endExclusive],
  );
  for (const row of overlaps.rows) {
    await client.query("delete from care_event_ranges where id = $1", [row.id]);
    const remainders = [
      row.start_date < start ? { start: row.start_date, end: start } : null,
      row.end_date > endExclusive
        ? { start: endExclusive, end: row.end_date }
        : null,
    ];
    for (const remainder of remainders) {
      if (!remainder) continue;
      await client.query(
        `
          insert into care_event_ranges (
            id, owner_user_id, group_id, start_date, end_date, event_type,
            issuer, name, description, style, created_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          randomUUID(),
          ownerUserId,
          row.group_id,
          remainder.start,
          remainder.end,
          row.event_type,
          row.issuer,
          row.name,
          row.description,
          row.style ?? {},
          row.created_at,
        ],
      );
    }
  }
  return overlaps.rowCount ?? 0;
}

export async function clearCareRange(ownerUserId: string, input: unknown) {
  const candidate =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  if (!isoDate(candidate.start) || !isoDate(candidate.end)) {
    throw new CareEventValidationError("Nieprawidłowy zakres dat.");
  }
  if (candidate.end < candidate.start) {
    throw new CareEventValidationError("Data końca jest przed datą startu.");
  }
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
  }).format(new Date());
  if (candidate.start <= today) {
    throw new CareEventValidationError("Można usuwać tylko przyszłą opiekę.");
  }
  const start = candidate.start;
  const endExclusive = addDays(candidate.end, 1);
  const removed = await withPostgresTransaction((client) =>
    cutCareRanges(client, ownerUserId, start, endExclusive),
  );
  return { removed };
}
