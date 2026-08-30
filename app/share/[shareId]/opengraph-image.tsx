import { ImageResponse } from "next/og";
import { getGradeRank } from "@/components/climberbook/common/training";
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

function gradeColor(grade: string) {
  const value = Number.parseInt(grade.replace(/^V/, ""), 10);
  const colors = [
    "#79c1aa",
    "#68b7a0",
    "#568cb8",
    "#e7bc58",
    "#db934e",
    "#c8705c",
  ];
  return colors[
    Math.max(
      0,
      Math.min(colors.length - 1, (Number.isFinite(value) ? value : 1) - 1),
    )
  ];
}

function getMaximumGrade(share: {
  difficultyBySurface?: Record<string, string>;
  grades: string[];
}) {
  const getGrades = (surface: string) =>
    (share.difficultyBySurface?.[surface] ?? "")
      .split(",")
      .map((grade) => grade.trim())
      .filter(Boolean);
  const boardGrades = ["baldy", "moon", "kilter"]
    .flatMap(getGrades)
    .filter((grade) => /^V?\d+$/.test(grade))
    .map((grade) => Number.parseInt(grade.replace(/^V/, ""), 10));
  const ropeGrades = getGrades("lina");
  const maximumRope = ropeGrades.reduce<string | null>(
    (highest, grade) =>
      !highest || getGradeRank(grade) > getGradeRank(highest) ? grade : highest,
    null,
  );
  const maximumBoardGrade = Math.max(...boardGrades);
  const maximumBoard = Number.isFinite(maximumBoardGrade)
    ? `V${maximumBoardGrade}`
    : null;
  if (maximumRope && maximumBoard) return `${maximumRope} · ${maximumBoard}`;
  if (maximumRope) return maximumRope;
  if (maximumBoard) return maximumBoard;
  const grades = Object.values(share.difficultyBySurface ?? {})
    .flatMap((value) => value.split(","))
    .map((grade) => grade.trim())
    .filter(Boolean);
  return grades.at(-1) ?? share.grades.at(-1) ?? "-";
}

function getStimulusLabel(percent: number | undefined) {
  if (percent === undefined) return "BRAK NORMY";
  if (percent < 25) return "ROZGRZEWKA";
  if (percent < 50) return "ROZRUCH";
  if (percent < 75) return "TROCHĘ MI SIĘ NIE CHCIAŁO";
  if (percent < 100) return "TO MOŻE MIEĆ JAKIŚ SENS";
  if (percent < 125) return "CIŚNIEMY";
  if (percent < 150) return "CZUJĘ CIAŁO";
  if (percent < 175) return "JESZCZE TRZYMAM CHWYTY";
  if (percent < 200) return "WPIERDOL";
  if (percent < 225) return "NA PEŁNEJ KURWIE";
  return "NIE TRZYMAM MOCZU";
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

  const grades = Object.values(share.difficultyBySurface ?? {})
    .flatMap((value) => value.split(","))
    .map((grade) => grade.trim())
    .filter(Boolean)
    .slice(-28);
  const weather = share.weatherSnapshot;
  const weatherPointLeft = weather
    ? Math.max(
        8,
        Math.min(88, ((weather.apparentTemperatureC + 10) / 45) * 100),
      )
    : 50;
  const weatherPointTop = weather
    ? Math.max(10, Math.min(82, 100 - weather.relativeHumidity))
    : 50;
  const metrics = [
    [
      "BODZIEC",
      share.stimulusNormPercent
        ? `${share.stimulusNormPercent}%`
        : "Brak normy",
      "#d16d3f",
    ],
    ["WSTAWKI", String(getReportedAttempts(share)), "#f5bd5b"],
    ["MAKS", getMaximumGrade(share), "#7e68bd"],
    ["ENERGIA", String(share.caloriesBurned), "#5cbd8b"],
  ];
  const stimulusSegments: Array<[string, number, string]> = [
    [
      "TLEN",
      share.stimulusDimensions?.aerobicEndurance ?? 0,
      "linear-gradient(to right, rgba(125, 197, 182, 1), rgba(125, 197, 182, 0))",
    ],
    [
      "SIŁA",
      share.stimulusDimensions?.strengthEndurance ?? 0,
      "linear-gradient(to right, rgba(231, 188, 88, 1), rgba(231, 188, 88, 0))",
    ],
    [
      "MOC",
      share.stimulusDimensions?.strengthPower ?? 0,
      "linear-gradient(to right, rgba(162, 71, 98, 1), rgba(162, 71, 98, 0))",
    ],
    [
      "KONTAKT",
      share.stimulusDimensions?.contactStrength ?? 0,
      "linear-gradient(to right, rgba(99, 132, 186, 1), rgba(99, 132, 186, 0))",
    ],
  ];
  const totalStimulus = stimulusSegments.reduce(
    (total, [, value]) => total + value,
    0,
  );
  const stimulusPercent = share.stimulusNormPercent ?? 0;
  const visibleStimulusPercent = Math.min(100, stimulusPercent);
  const normMarkerLeft =
    stimulusPercent > 100 ? (100 / stimulusPercent) * 100 : null;

  return new ImageResponse(
    <div
      style={{
        background: "#10151e",
        color: "#fffaf0",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "34px 48px 38px",
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          borderBottom: "1px solid #334052",
          display: "flex",
          justifyContent: "space-between",
          paddingBottom: 18,
        }}
      >
        <span
          style={{
            color: "#fffaf0",
            display: "flex",
            fontSize: 23,
            fontWeight: 700,
            letterSpacing: "0.1em",
          }}
        >
          CLIMBERBOOK
        </span>
        <span style={{ color: "#aeb8c8", display: "flex", fontSize: 19 }}>
          {formatDate(share.date)}
        </span>
      </div>
      <div
        style={{
          alignItems: "flex-start",
          display: "flex",
          gap: 30,
          marginTop: 22,
        }}
      >
        <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
          <span
            style={{
              color: "#d16d3f",
              display: "flex",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.12em",
            }}
          >
            UDOSTĘPNIONA SESJA
          </span>
          <span
            style={{
              display: "flex",
              fontSize: 42,
              fontWeight: 700,
              lineHeight: 1.05,
              marginTop: 7,
            }}
          >
            {share.facilityName || "Trening wspinaczkowy"}
          </span>
          {share.activity ? (
            <span
              style={{
                color: "#aeb8c8",
                display: "flex",
                fontSize: 18,
                marginTop: 8,
              }}
            >
              {share.activity}
            </span>
          ) : null}
        </div>
        <div
          style={{
            alignItems: "flex-end",
            display: "flex",
            flexDirection: "column",
            minWidth: 275,
          }}
        >
          <span
            style={{
              color: "#aeb8c8",
              display: "flex",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.1em",
            }}
          >
            TRENING
          </span>
          <span
            style={{
              color: "#f5bd5b",
              display: "flex",
              fontSize: 36,
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            {formatDuration(share.durationMinutes)}
          </span>
          <span
            style={{
              color: "#aeb8c8",
              display: "flex",
              fontSize: 16,
              marginTop: 2,
            }}
          >
            {getReportedAttempts(share)} wstawek · {share.caloriesBurned} kcal
          </span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginTop: "auto",
        }}
      >
        {metrics.map(([label, value, accent]) => (
          <div
            key={label}
            style={{
              alignItems: "center",
              background: "#171e2b",
              borderTop: `5px solid ${accent}`,
              display: "flex",
              flex: "1 1 42%",
              justifyContent: "space-between",
              minHeight: 126,
              padding: "20px 22px",
            }}
          >
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxWidth: 285,
              }}
            >
              <b
                style={{
                  color: "#aeb8c8",
                  display: "flex",
                  fontSize: 18,
                  letterSpacing: "0.1em",
                }}
              >
                {label}
              </b>
              {label === "BODZIEC" ? (
                <span
                  style={{
                    color: accent,
                    display: "flex",
                    fontSize: 18,
                    fontWeight: 700,
                    lineHeight: 1.1,
                  }}
                >
                  {share.stimulusLabel ||
                    getStimulusLabel(share.stimulusNormPercent)}
                </span>
              ) : null}
            </span>
            {label === "ENERGIA" ? (
              <span style={{ alignItems: "flex-end", display: "flex", gap: 4 }}>
                <b
                  style={{
                    color: accent,
                    display: "flex",
                    fontSize: 44,
                    fontWeight: 800,
                  }}
                >
                  {value}
                </b>
                <span
                  style={{
                    color: "#fffaf0",
                    display: "flex",
                    fontSize: 22,
                    marginBottom: 10,
                  }}
                >
                  /1000
                </span>
                <span
                  style={{
                    color: "#aeb8c8",
                    display: "flex",
                    fontSize: 18,
                    marginBottom: 10,
                  }}
                >
                  kcal
                </span>
              </span>
            ) : (
              <span
                style={{
                  color: accent,
                  display: "flex",
                  fontSize: 44,
                  fontWeight: 800,
                  textAlign: "right",
                }}
              >
                {value}
              </span>
            )}
          </div>
        ))}
      </div>
      <div
        style={{
          background: "#202a3a",
          display: "flex",
          height: 42,
          marginTop: 16,
          position: "relative",
          width: "100%",
        }}
      >
        {stimulusSegments.map(([label, value, color]) => (
          <span
            key={label}
            style={{
              alignItems: "center",
              backgroundImage: color,
              color: "#fffaf0",
              display: "flex",
              fontSize: 15,
              fontWeight: 800,
              justifyContent: "flex-start",
              overflow: "hidden",
              paddingLeft:
                totalStimulus &&
                (value / totalStimulus) * visibleStimulusPercent >= 12
                  ? "1rem"
                  : 0,
              width: `${totalStimulus ? (value / totalStimulus) * visibleStimulusPercent : 0}%`,
            }}
          >
            {totalStimulus &&
            (value / totalStimulus) * visibleStimulusPercent >= 12
              ? `${label} ${Math.round((value / totalStimulus) * 100)}%`
              : ""}
          </span>
        ))}
        {normMarkerLeft !== null ? (
          <span
            style={{
              background: "#ef5350",
              display: "flex",
              height: 54,
              left: `${normMarkerLeft}%`,
              position: "absolute",
              top: -6,
              width: 4,
            }}
          />
        ) : null}
      </div>
      <div style={{ display: "none" }}>
        <div
          style={{
            background: "#171e2b",
            borderTop: "4px solid #d16d3f",
            display: "flex",
            flex: 1.3,
            flexDirection: "column",
            padding: "18px 22px 20px",
          }}
        >
          <span
            style={{
              color: "#d16d3f",
              display: "flex",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.1em",
            }}
          >
            WYKRES SESJI
          </span>
          <span
            style={{
              display: "flex",
              fontSize: 25,
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            Wyceny na sesję
          </span>
          <div
            style={{
              alignItems: "flex-end",
              borderBottom: "2px solid #65728a",
              display: "flex",
              flex: 1,
              gap: 9,
              marginTop: 8,
              padding: "0 18px 12px",
            }}
          >
            {grades.length ? (
              grades.map((grade, index) => (
                <span
                  key={`${grade}-${index}`}
                  style={{
                    background: gradeColor(grade),
                    borderRadius: 99,
                    display: "flex",
                    boxShadow: "0 0 0 4px #171e2b",
                    height: 19,
                    marginBottom: `${Math.max(0, ((Number.parseInt(grade.replace(/^V/, ""), 10) || 1) - 1) * 17)}px`,
                    width: 19,
                  }}
                />
              ))
            ) : (
              <span style={{ color: "#c8cec8", display: "flex", fontSize: 18 }}>
                Brak zapisanych wycen
              </span>
            )}
          </div>
        </div>
        <div
          style={{
            background: "#171e2b",
            borderTop: "4px solid #5cbd8b",
            display: "flex",
            flex: 1,
            flexDirection: "column",
            padding: "18px 22px 20px",
          }}
        >
          <span
            style={{
              color: "#5cbd8b",
              display: "flex",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.1em",
            }}
          >
            POGODA
          </span>
          <span
            style={{
              display: "flex",
              fontSize: 25,
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            Warunki zewnętrzne
          </span>
          <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
            <span style={{ display: "flex", flexDirection: "column" }}>
              <b style={{ color: "#8e9caf", display: "flex", fontSize: 12 }}>
                ODCZUWALNA
              </b>
              <b style={{ display: "flex", fontSize: 23, marginTop: 3 }}>
                {weather
                  ? `${weather.apparentTemperatureC.toFixed(1)} °C`
                  : "-"}
              </b>
            </span>
            <span style={{ display: "flex", flexDirection: "column" }}>
              <b style={{ color: "#8e9caf", display: "flex", fontSize: 12 }}>
                WILGOTNOŚĆ
              </b>
              <b style={{ display: "flex", fontSize: 23, marginTop: 3 }}>
                {weather ? `${Math.round(weather.relativeHumidity)}%` : "-"}
              </b>
            </span>
          </div>
          <div
            style={{
              background:
                "linear-gradient(180deg, #75444d 0%, #967844 44%, #56834c 72%, #325d45 100%)",
              border: "1px solid #405066",
              display: "flex",
              flex: 1,
              marginTop: 16,
              position: "relative",
            }}
          >
            <span
              style={{
                background: "#f5bd5b",
                border: "5px solid #10151e",
                borderRadius: 99,
                boxShadow: "0 0 0 3px #fffaf0",
                display: "flex",
                height: 22,
                left: `${weatherPointLeft}%`,
                position: "absolute",
                top: `${weatherPointTop}%`,
                width: 22,
              }}
            />
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
