import type { AscentRecord } from "@/lib/climbs-db";

type CsvRow = Record<string, string>;

export type CsvSkippedAscentRow = {
  lineNumber: number;
  routeName: string;
  style: string;
  reason: string;
  canImportWhenSelected: boolean;
};

export type CsvAscentImportResult = {
  ascents: Array<Omit<AscentRecord, "id" | "createdAt" | "athleteId">>;
  optionalAscents: Array<Omit<AscentRecord, "id" | "createdAt" | "athleteId">>;
  skippedRows: number;
  skippedAscentRows: CsvSkippedAscentRow[];
  skippedGoProjects: number;
  skippedTopropes: number;
  skippedOtherStyles: number;
};

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let isQuoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (isQuoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        isQuoted = !isQuoted;
      }
    } else if (character === "," && !isQuoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !isQuoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);

  return rows;
}

function normalizeGrade(value: string) {
  const grade = value.trim().toLowerCase();

  return /^[4-9][abc](?:\+)?(?:\/(?:[4-9][abc](?:\+)?|[abc]))?$/.test(grade)
    ? grade
    : null;
}

function parseDate(value: string) {
  const match = value
    .trim()
    .match(/^(\d{4}-\d{2}-\d{2})T|^(\d{4}-\d{2}-\d{2})$/);

  return match?.[1] ?? match?.[2] ?? null;
}

function buildNotes(row: CsvRow) {
  const place = [
    row.location_name,
    row.sector_name,
    row.area_name,
    row.country_code,
  ]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" · ");
  const details = [
    place ? `Miejsce: ${place}` : "",
    row.comment?.trim(),
  ].filter(Boolean);

  return details.join("\n");
}

export function parse8aNuCsv(text: string): CsvAscentImportResult {
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  const [headers, ...dataRows] = rows;

  if (!headers?.length) {
    throw new Error("Plik CSV nie zawiera nagłówków.");
  }

  const normalizedHeaders = headers.map((header) => header.trim());
  const requiredHeaders = ["name", "date", "difficulty"];

  if (!requiredHeaders.every((header) => normalizedHeaders.includes(header))) {
    throw new Error("To nie jest rozpoznany eksport CSV z 8a.nu.");
  }

  let skippedGoProjects = 0;
  let skippedTopropes = 0;
  let skippedOtherStyles = 0;
  const ascents: CsvAscentImportResult["ascents"] = [];
  const optionalAscents: CsvAscentImportResult["optionalAscents"] = [];
  const skippedAscentRows: CsvSkippedAscentRow[] = [];

  dataRows.forEach((values, index) => {
    const row = Object.fromEntries(
      normalizedHeaders.map((header, index) => [header, values[index] ?? ""]),
    );
    const date = parseDate(row.date);
    const grade = normalizeGrade(row.difficulty);
    const routeName = row.name.trim();
    const rawStyle = row.type?.trim() ?? "";
    const style = rawStyle.toUpperCase();

    const isCompletedStyle = ["OS", "FL", "F", "RP"].includes(style);

    if (!date || !grade || !routeName) {
      skippedAscentRows.push({
        lineNumber: index + 2,
        routeName: routeName || "Bez nazwy",
        style: rawStyle,
        reason: "Niepoprawne dane",
        canImportWhenSelected: false,
      });
      return;
    }

    const ascent = {
      date,
      source: "skala" as const,
      importSource: "8a.nu" as const,
      routeName,
      suggestedGrade: grade,
      subjectiveGrade: grade,
      style: rawStyle || undefined,
      notes: buildNotes(row),
    };

    if (isCompletedStyle) {
      ascents.push(ascent);
    } else {
      const isGoProject = style === "GO";
      const isToprope = style === "TR" || style === "TOPROPE";

      if (isGoProject) {
        skippedGoProjects += 1;
      } else if (isToprope) {
        skippedTopropes += 1;
      } else {
        skippedOtherStyles += 1;
      }

      optionalAscents.push(ascent);
      skippedAscentRows.push({
        lineNumber: index + 2,
        routeName,
        style: rawStyle || "Brak stylu",
        reason: isGoProject
          ? "Projekt GO"
          : isToprope
            ? "Toprope"
            : "Inny styl",
        canImportWhenSelected: true,
      });
    }
  });

  return {
    ascents,
    optionalAscents,
    skippedRows: skippedAscentRows.length,
    skippedAscentRows,
    skippedGoProjects,
    skippedTopropes,
    skippedOtherStyles,
  };
}
