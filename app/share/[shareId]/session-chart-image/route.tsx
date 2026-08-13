import { ImageResponse } from "next/og";
import { getPublicTrainingShareFromPostgres } from "@/lib/server/climberbook-repository";

export const runtime = "nodejs";

const size = { width: 1200, height: 630 };

function gradeColor(grade: string) {
  const value = Number.parseInt(grade.replace(/^V/, ""), 10);
  return [
    "#88c9b0",
    "#79c1aa",
    "#63b69d",
    "#508bb7",
    "#e8b457",
    "#dc9049",
    "#c76d57",
  ][Math.max(0, Math.min(6, (Number.isFinite(value) ? value : 1) - 1))];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shareId: string }> },
) {
  const { shareId } = await params;
  const share = /^[A-Za-z0-9_-]{12}$/.test(shareId)
    ? await getPublicTrainingShareFromPostgres(shareId)
    : null;
  const grades = Object.values(share?.difficultyBySurface ?? {})
    .flatMap((value) => value.split(","))
    .map((grade) => grade.trim())
    .filter(Boolean)
    .slice(-36);

  return new ImageResponse(
    <div
      style={{
        background: "#151923",
        color: "#fffaf0",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "54px 64px",
        width: "100%",
      }}
    >
      <span
        style={{
          color: "#d16d3f",
          display: "flex",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: "0.12em",
        }}
      >
        WYKRES SESJI
      </span>
      <span
        style={{
          display: "flex",
          fontSize: 44,
          fontWeight: 700,
          marginTop: 12,
        }}
      >
        Wyceny na sesję
      </span>
      <span
        style={{
          color: "#c8cec8",
          display: "flex",
          fontSize: 24,
          marginTop: 10,
        }}
      >
        {share?.activity ?? "Trening wspinaczkowy"}
      </span>
      <div
        style={{
          alignItems: "flex-end",
          borderBottom: "2px solid #68707a",
          display: "flex",
          gap: 12,
          height: 280,
          marginTop: "auto",
          padding: "0 28px 24px",
        }}
      >
        {grades.length ? (
          grades.map((grade, index) => (
            <div
              key={`${grade}-${index}`}
              style={{
                alignItems: "center",
                background: gradeColor(grade),
                borderRadius: 999,
                display: "flex",
                height: 26,
                justifyContent: "center",
                marginBottom: `${(Number.parseInt(grade.replace(/^V/, ""), 10) || 1) * 22}px`,
                width: 26,
              }}
            />
          ))
        ) : (
          <span style={{ color: "#c8cec8", display: "flex", fontSize: 24 }}>
            Brak zapisanych wycen
          </span>
        )}
      </div>
    </div>,
    size,
  );
}
