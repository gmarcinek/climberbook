import { ImageResponse } from "next/og";
import { getPublicTrainingShareFromPostgres } from "@/lib/server/climberbook-repository";

export const runtime = "nodejs";
export const alt = "Udostępniony trening w Climberbook";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function formatDuration(durationMinutes: number) {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return hours
    ? `${hours} godz. ${minutes ? `${minutes} min` : ""}`
    : `${minutes} min`;
}

function getReportedAttempts(share: {
  attemptsCount: number;
  difficultyBySurface?: Record<string, string>;
  grades: string[];
}) {
  const gradeCount = Object.values(share.difficultyBySurface ?? {}).reduce(
    (total, grades) =>
      total + grades.split(",").filter((grade) => grade.trim()).length,
    0,
  );
  return gradeCount || share.grades.length || share.attemptsCount || "-";
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const share = /^[A-Za-z0-9_-]{12}$/.test(shareId)
    ? await getPublicTrainingShareFromPostgres(shareId)
    : null;

  if (!share) {
    return new ImageResponse(
      <div
        style={{
          alignItems: "center",
          background: "#153d35",
          color: "#f4f1e7",
          display: "flex",
          fontSize: 54,
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        CLIMBERBOOK
      </div>,
      size,
    );
  }

  return new ImageResponse(
    <div
      style={{
        background: "#f4f1e7",
        color: "#173b34",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "60px 72px",
        width: "100%",
      }}
    >
      <div
        style={{
          color: "#173b34",
          display: "flex",
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: "0.08em",
        }}
      >
        CLIMBERBOOK
      </div>
      <div
        style={{
          color: "#b55631",
          display: "flex",
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: "0.08em",
          marginTop: 42,
        }}
      >
        UDOSTĘPNIONY TRENING
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "Georgia, serif",
          fontSize: 62,
          fontWeight: 700,
          lineHeight: 1.1,
          marginTop: 14,
          maxWidth: "1000px",
        }}
      >
        {share.activity}
      </div>
      <div
        style={{
          color: "#5e6961",
          display: "flex",
          fontSize: 26,
          marginTop: 16,
        }}
      >
        {formatDate(share.date)}
        {share.facilityName ? ` · ${share.facilityName}` : ""}
      </div>
      <div
        style={{
          background: "#ffffff",
          border: "2px solid #d9d1c0",
          display: "flex",
          gap: 70,
          marginTop: "auto",
          padding: "28px 34px",
        }}
      >
        {[
          ["CZAS", formatDuration(share.durationMinutes)],
          ["KALORIE", `${share.caloriesBurned} kcal`],
          ["WSTAWKI", String(getReportedAttempts(share))],
        ].map(([label, value]) => (
          <div key={label} style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#b55631", fontSize: 18, fontWeight: 700 }}>
              {label}
            </span>
            <span
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 32,
                fontWeight: 700,
                marginTop: 8,
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
