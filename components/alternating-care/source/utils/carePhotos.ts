'use client';

export type CarePhoto = {
  id: string;
  groupId: string | null;
  takenDate: string;
  description: string;
  status: 'pending' | 'confirmed';
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
  /** WITH_WARD / WARD / CARE, a document type or a calendar event type; '' when unset. */
  category: string;
  /** Town resolved from GPS; '' when unknown. */
  place: string;
  country: string;
  countryCode: string;
};

type PhotoMetadata = {
  takenAt?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  camera?: string;
  exif: Record<string, string | number>;
};

const EXIF_FIELDS = [
  'LensModel',
  'ExposureTime',
  'FNumber',
  'ISO',
  'FocalLength',
  'FocalLengthIn35mmFormat',
  'Flash',
  'Software',
  'ExifImageWidth',
  'ExifImageHeight',
] as const;

// Must run on the original file: resizing in a canvas drops all EXIF data.
async function readMetadata(file: File): Promise<PhotoMetadata> {
  try {
    const exifr = (await import('exifr')).default;
    const data = (await exifr.parse(file, { gps: true, tiff: true, exif: true })) as
      | Record<string, unknown>
      | undefined;
    if (!data) return { exif: {} };
    const taken = data.DateTimeOriginal ?? data.CreateDate ?? data.ModifyDate;
    const camera = [data.Make, data.Model]
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value, index, all) => value && !(index === 0 && String(all[1]).startsWith(value)))
      .join(' ');
    const exif: Record<string, string | number> = {};
    EXIF_FIELDS.forEach((key) => {
      const value = data[key];
      if (typeof value === 'number' && Number.isFinite(value)) exif[key] = value;
      if (typeof value === 'string' && value.trim()) exif[key] = value.trim();
    });
    return {
      takenAt: taken instanceof Date && !Number.isNaN(taken.getTime()) ? taken.toISOString() : undefined,
      latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
      longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
      altitude: typeof data.GPSAltitude === 'number' ? data.GPSAltitude : undefined,
      camera: camera || undefined,
      exif,
    };
  } catch {
    return { exif: {} };
  }
}

export const CARE_PHOTOS_QUERY_KEY = ['carePhotos'];
// Transport size only; the server always produces the final 1024px / q65 JPEG.
const UPLOAD_MAX_SIDE = 2048;
const UPLOAD_BATCH = 4;

export const carePhotoUrl = (id: string) => `/api/care/photos/${id}`;

async function photoRequest<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { ...init, cache: 'no-store' });
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error ?? 'Nie udało się przetworzyć zdjęć.');
  }
  return payload;
}

export async function getPhotoConsent() {
  return photoRequest<{ accepted: boolean; termsVersion: string }>(
    '/api/care/photos/consent',
  );
}

export async function acceptPhotoConsent(termsVersion: string) {
  return photoRequest<{ accepted: boolean }>('/api/care/photos/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ termsVersion }),
  });
}

export async function listCarePhotos(params: {
  status?: CarePhoto['status'];
  groupId?: string;
  start?: string;
  end?: string;
}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const { photos } = await photoRequest<{ photos: CarePhoto[] }>(
    `/api/care/photos?${search.toString()}`,
  );
  return photos;
}

export async function updateCarePhoto(
  id: string,
  changes: Partial<
    Pick<CarePhoto, 'description' | 'groupId' | 'takenDate' | 'status' | 'category'>
  >,
) {
  const { photo } = await photoRequest<{ photo: CarePhoto }>(
    `/api/care/photos/${id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    },
  );
  return photo;
}

export async function confirmCarePhotos(ids: string[]) {
  return photoRequest<{ photos: CarePhoto[] }>('/api/care/photos', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, status: 'confirmed' }),
  });
}

export async function deleteCarePhoto(id: string) {
  const response = await fetch(`/api/care/photos/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Nie udało się usunąć zdjęcia.');
}

const toIsoDate = (time: number) => {
  const date = new Date(time);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const HEIC_NAME = /\.(heic|heif)$/i;

// iPhone photos: browsers often report an empty MIME type for HEIC files.
export const isHeicFile = (file: File) =>
  /^image\/hei[cf]/i.test(file.type) || HEIC_NAME.test(file.name);

export const isImageFile = (file: File) =>
  file.type.startsWith('image/') || HEIC_NAME.test(file.name);

// Most browsers (and the server's image library) cannot decode HEIC, so it is
// converted to JPEG here with libheif compiled to WebAssembly.
async function decodeHeic(file: File): Promise<Blob> {
  const { heicTo } = await import('heic-to/next');
  return heicTo({ blob: file, type: 'image/jpeg', quality: 0.92 });
}

// Shrinks big camera photos before upload; falls back to the original file.
async function shrinkForUpload(file: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: 'from-image',
    });
    const scale = Math.min(1, UPLOAD_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.type === 'image/jpeg') {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No canvas');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

export async function uploadCarePhotos(
  files: File[],
  options: { groupId?: string | null; takenDate?: string },
  onProgress?: (done: number, total: number) => void,
) {
  const uploaded: CarePhoto[] = [];
  for (let index = 0; index < files.length; index += UPLOAD_BATCH) {
    const batch = files.slice(index, index + UPLOAD_BATCH);
    const form = new FormData();
    for (const file of batch) {
      // EXIF is read from the original file; decoding and resizing drop it.
      const metadata = await readMetadata(file);
      let source: Blob = file;
      if (isHeicFile(file)) {
        try {
          source = await decodeHeic(file);
        } catch {
          throw new Error(`Nie udało się odczytać zdjęcia HEIC: ${file.name}`);
        }
      }
      form.append(
        'files',
        await shrinkForUpload(source),
        file.name.replace(HEIC_NAME, '.jpg'),
      );
      form.append(
        'takenDates',
        options.takenDate ??
          toIsoDate(metadata.takenAt ? Date.parse(metadata.takenAt) : file.lastModified),
      );
      form.append('metadata', JSON.stringify(metadata));
    }
    if (options.groupId) form.append('groupId', options.groupId);
    const { photos } = await photoRequest<{ photos: CarePhoto[] }>(
      '/api/care/photos',
      { method: 'POST', body: form },
    );
    uploaded.push(...photos);
    onProgress?.(Math.min(index + batch.length, files.length), files.length);
  }
  return uploaded;
}
