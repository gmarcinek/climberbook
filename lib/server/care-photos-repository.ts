import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { queryPostgres } from "@/lib/server/postgres";
import { reverseGeocode } from "@/lib/server/reverse-geocode";
import { CalendarEventType } from "@/components/alternating-care/source/api/db/types";

const PHOTO_CATEGORIES = new Set<string>([
  "WITH_WARD",
  "WARD",
  "CARE",
  "RECEIPT",
  "INVOICE",
  "BILL",
  "PAYMENT_PROOF",
  ...Object.values(CalendarEventType).filter(
    (type) =>
      type !== CalendarEventType.Offset &&
      type !== CalendarEventType.Alternating &&
      type !== CalendarEventType.Todo,
  ),
]);

export const PHOTO_TERMS_VERSION = "2026-11-26b";
const MAX_SIDE = 1024;
const JPEG_QUALITY = 65;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD = 40;

export class CarePhotoError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export type CarePhoto = {
  id: string;
  groupId: string | null;
  takenDate: string;
  description: string;
  status: "pending" | "confirmed";
  width: number;
  height: number;
  byteSize: number;
  createdAt: number;
  takenAt: number | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  camera: string;
  exif: Record<string, string | number>;
  category: string;
  place: string;
  country: string;
  countryCode: string;
};

export type CarePhotoMetadata = Pick<
  CarePhoto,
  "takenAt" | "latitude" | "longitude" | "altitude" | "camera" | "exif"
>;

type CarePhotoRow = {
  id: string;
  group_id: string | null;
  taken_date: string;
  description: string;
  status: CarePhoto["status"];
  width: number;
  height: number;
  byte_size: number;
  created_at: Date;
  taken_at: Date | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  camera: string;
  exif: Record<string, string | number> | null;
  category: string;
  place: string | null;
  country: string | null;
  country_code: string | null;
};

const PHOTO_COLUMNS =
  "id, group_id, taken_date, description, status, width, height, byte_size, created_at, taken_at, latitude, longitude, altitude, camera, exif, category, place, country, country_code";

const toPhoto = (row: CarePhotoRow): CarePhoto => ({
  id: row.id,
  groupId: row.group_id,
  takenDate: row.taken_date,
  description: row.description,
  status: row.status,
  width: row.width,
  height: row.height,
  byteSize: row.byte_size,
  createdAt: row.created_at.getTime(),
  takenAt: row.taken_at?.getTime() ?? null,
  latitude: row.latitude,
  longitude: row.longitude,
  altitude: row.altitude,
  camera: row.camera,
  exif: row.exif ?? {},
  category: row.category,
  place: row.place ?? "",
  country: row.country ?? "",
  countryCode: row.country_code ?? "",
});

async function resolvePlace(ownerUserId: string, id: string, latitude: number, longitude: number) {
  const geo = await reverseGeocode(latitude, longitude);
  if (!geo) return null;
  const result = await queryPostgres<CarePhotoRow>(
    `
      update care_photos set place = $3, country = $4, country_code = $5
      where owner_user_id = $1 and id = $2
      returning ${PHOTO_COLUMNS}
    `,
    [ownerUserId, id, geo.place, geo.country, geo.countryCode],
  );
  return result.rows[0] ? toPhoto(result.rows[0]) : null;
}

const backfillingOwners = new Set<string>();

// Older photos were saved before places were resolved; fill them in the background.
function backfillPlaces(ownerUserId: string) {
  if (backfillingOwners.has(ownerUserId)) return;
  backfillingOwners.add(ownerUserId);
  void (async () => {
    try {
      const missing = await queryPostgres<{ id: string; latitude: number; longitude: number }>(
        `
          select id, latitude, longitude from care_photos
          where owner_user_id = $1 and place is null
            and latitude is not null and longitude is not null
          order by created_at desc
          limit 50
        `,
        [ownerUserId],
      );
      for (const row of missing.rows) {
        await resolvePlace(ownerUserId, row.id, row.latitude, row.longitude);
      }
    } catch {
      // Best effort only.
    } finally {
      backfillingOwners.delete(ownerUserId);
    }
  })();
}

const finiteIn = (value: unknown, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : null;

// EXIF is read in the browser (before resizing drops it) and sent as JSON per file.
function normalizeMetadata(value: unknown): CarePhotoMetadata {
  let input: Record<string, unknown> = {};
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : null;
    if (parsed && typeof parsed === "object") input = parsed as Record<string, unknown>;
  } catch {
    input = {};
  }
  const takenAt =
    typeof input.takenAt === "string" && !Number.isNaN(Date.parse(input.takenAt))
      ? Date.parse(input.takenAt)
      : null;
  const exif: Record<string, string | number> = {};
  if (input.exif && typeof input.exif === "object") {
    Object.entries(input.exif as Record<string, unknown>)
      .slice(0, 30)
      .forEach(([key, item]) => {
        if (!/^[A-Za-z0-9]{1,40}$/.test(key)) return;
        if (typeof item === "number" && Number.isFinite(item)) exif[key] = item;
        if (typeof item === "string") exif[key] = item.slice(0, 120);
      });
  }
  return {
    takenAt: takenAt !== null && takenAt > 0 && takenAt < Date.now() + 86_400_000 ? takenAt : null,
    latitude: finiteIn(input.latitude, -90, 90),
    longitude: finiteIn(input.longitude, -180, 180),
    altitude: finiteIn(input.altitude, -1000, 100_000),
    camera: typeof input.camera === "string" ? input.camera.trim().slice(0, 120) : "",
    exif,
  };
}

const isIsoDate = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function normalizeGroupId(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.length > 200) {
    throw new CarePhotoError("Nieprawidłowe wydarzenie zdjęcia.");
  }
  return value.trim() || null;
}

function normalizeDescription(value: unknown) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new CarePhotoError("Nieprawidłowy opis zdjęcia.");
  }
  return value.trim().slice(0, 2000);
}

export async function hasPhotoConsent(ownerUserId: string) {
  const result = await queryPostgres<{ terms_version: string }>(
    "select terms_version from care_photo_consents where owner_user_id = $1",
    [ownerUserId],
  );
  return result.rows[0]?.terms_version === PHOTO_TERMS_VERSION;
}

export async function acceptPhotoTerms(ownerUserId: string, termsVersion: unknown) {
  if (termsVersion !== PHOTO_TERMS_VERSION) {
    throw new CarePhotoError("Zaakceptuj aktualną wersję regulaminu.");
  }
  await queryPostgres(
    `
      insert into care_photo_consents (owner_user_id, terms_version, accepted_at)
      values ($1, $2, now())
      on conflict (owner_user_id)
      do update set terms_version = excluded.terms_version, accepted_at = now()
    `,
    [ownerUserId, PHOTO_TERMS_VERSION],
  );
}

// Always re-encodes on the server, so stored photos are JPEG <= 1024px at quality 65
// without EXIF metadata (location etc.), regardless of what the client sent.
async function toStoredJpeg(input: Buffer) {
  try {
    const { data, info } = await sharp(input, { failOn: "error" })
      .rotate()
      .resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    throw new CarePhotoError("Plik nie jest obsługiwanym obrazem.");
  }
}

export async function uploadCarePhotos(
  ownerUserId: string,
  files: File[],
  options: {
    groupId?: unknown;
    takenDates?: unknown[];
    metadata?: unknown[];
    description?: unknown;
  },
) {
  if (!(await hasPhotoConsent(ownerUserId))) {
    throw new CarePhotoError("Najpierw zaakceptuj regulamin zdjęć.", 403);
  }
  if (files.length === 0) throw new CarePhotoError("Nie wybrano zdjęć.");
  if (files.length > MAX_FILES_PER_UPLOAD) {
    throw new CarePhotoError(
      `Możesz dodać najwyżej ${MAX_FILES_PER_UPLOAD} zdjęć naraz.`,
    );
  }
  const groupId = normalizeGroupId(options.groupId);
  const description = normalizeDescription(options.description);
  const today = new Date().toISOString().slice(0, 10);

  const saved: CarePhoto[] = [];
  for (const [index, file] of files.entries()) {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new CarePhotoError("Zdjęcie jest większe niż 25 MB.");
    }
    const image = await toStoredJpeg(Buffer.from(await file.arrayBuffer()));
    const takenDate = options.takenDates?.[index];
    const metadata = normalizeMetadata(options.metadata?.[index]);
    const result = await queryPostgres<CarePhotoRow>(
      `
        insert into care_photos (
          id, owner_user_id, group_id, taken_date, description, status,
          width, height, byte_size, image_data,
          taken_at, latitude, longitude, altitude, camera, exif
        )
        values (
          $1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15
        )
        returning ${PHOTO_COLUMNS}
      `,
      [
        randomUUID(),
        ownerUserId,
        groupId,
        isIsoDate(takenDate) ? takenDate : today,
        description,
        image.width,
        image.height,
        image.data.length,
        image.data,
        metadata.takenAt === null ? null : new Date(metadata.takenAt),
        metadata.latitude,
        metadata.longitude,
        metadata.altitude,
        metadata.camera,
        metadata.exif,
      ],
    );
    const photo = toPhoto(result.rows[0]);
    const withPlace =
      photo.latitude !== null && photo.longitude !== null
        ? await resolvePlace(ownerUserId, photo.id, photo.latitude, photo.longitude).catch(() => null)
        : null;
    saved.push(withPlace ?? photo);
  }
  return saved;
}

export async function listCarePhotos(
  ownerUserId: string,
  filters: { status?: string | null; groupId?: string | null; start?: string | null; end?: string | null },
) {
  const result = await queryPostgres<CarePhotoRow>(
    `
      select ${PHOTO_COLUMNS}
      from care_photos
      where owner_user_id = $1
        and ($2::text is null or status = $2)
        and ($3::text is null or group_id = $3)
        and ($4::date is null or taken_date >= $4::date)
        and ($5::date is null or taken_date <= $5::date)
      order by taken_date desc, created_at desc
    `,
    [
      ownerUserId,
      filters.status === "pending" || filters.status === "confirmed"
        ? filters.status
        : null,
      filters.groupId || null,
      isIsoDate(filters.start) ? filters.start : null,
      isIsoDate(filters.end) ? filters.end : null,
    ],
  );
  const photos = result.rows.map(toPhoto);
  backfillPlaces(ownerUserId);
  return photos;
}

export async function getCarePhotoImage(ownerUserId: string, id: string) {
  if (!isUuid(id)) return null;
  const result = await queryPostgres<{ image_data: Buffer }>(
    "select image_data from care_photos where owner_user_id = $1 and id = $2",
    [ownerUserId, id],
  );
  return result.rows[0]?.image_data ?? null;
}

export async function updateCarePhotos(
  ownerUserId: string,
  ids: string[],
  input: Record<string, unknown>,
) {
  const validIds = ids.filter(isUuid);
  if (validIds.length === 0) throw new CarePhotoError("Brak zdjęć do zmiany.");
  if ("status" in input && input.status !== "pending" && input.status !== "confirmed") {
    throw new CarePhotoError("Nieprawidłowy status zdjęcia.");
  }
  if ("category" in input) {
    const categories = String(input.category ?? "")
      .split(",")
      .filter(Boolean);
    if (
      categories.length > 12 ||
      categories.some((category) => !PHOTO_CATEGORIES.has(category))
    ) {
      throw new CarePhotoError("Nieprawidłowy typ zdjęcia.");
    }
    input = { ...input, category: [...new Set(categories)].join(",") };
  }
  if ("takenDate" in input && !isIsoDate(input.takenDate)) {
    throw new CarePhotoError("Nieprawidłowa data zdjęcia.");
  }
  const result = await queryPostgres<CarePhotoRow>(
    `
      update care_photos set
        description = case when $3::boolean then $4 else description end,
        group_id = case when $5::boolean then $6 else group_id end,
        taken_date = case when $7::boolean then $8::date else taken_date end,
        status = coalesce($9, status),
        category = case when $10::boolean then $11 else category end,
        updated_at = now()
      where owner_user_id = $1 and id = any($2::uuid[])
      returning ${PHOTO_COLUMNS}
    `,
    [
      ownerUserId,
      validIds,
      "description" in input,
      "description" in input ? normalizeDescription(input.description) : "",
      "groupId" in input,
      "groupId" in input ? normalizeGroupId(input.groupId) : null,
      "takenDate" in input,
      "takenDate" in input ? input.takenDate : null,
      typeof input.status === "string" ? input.status : null,
      "category" in input,
      "category" in input ? String(input.category) : "",
    ],
  );
  return result.rows.map(toPhoto);
}

export async function deleteCarePhoto(ownerUserId: string, id: string) {
  if (!isUuid(id)) throw new CarePhotoError("Nieprawidłowe zdjęcie.");
  await queryPostgres(
    "delete from care_photos where owner_user_id = $1 and id = $2",
    [ownerUserId, id],
  );
}

export function carePhotoErrorResponse(error: unknown) {
  if (error instanceof CarePhotoError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error("Care photos API failed", error);
  return Response.json(
    { error: "Nie udało się przetworzyć zdjęć." },
    { status: 500 },
  );
}
