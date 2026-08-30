import { ImageResponse } from "next/og";
import { getPublicTrainingShareFromPostgres } from "@/lib/server/climberbook-repository";

export const runtime = "nodejs";

const size = { width: 1200, height: 630 };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shareId: string }> },
) {
  const { shareId } = await params;
  const share = /^[A-Za-z0-9_-]{12}$/.test(shareId)
    ? await getPublicTrainingShareFromPostgres(shareId)
    : null;
  const weather = share?.weatherSnapshot;
  const values = [
    ["TEMPERATURA", weather ? `${weather.temperatureC.toFixed(1)} °C` : "-"],
    [
      "ODCZUWALNA",
      weather ? `${weather.apparentTemperatureC.toFixed(1)} °C` : "-",
    ],
    ["WILGOTNOŚĆ", weather ? `${Math.round(weather.relativeHumidity)}%` : "-"],
    ["WIATR", weather ? `${weather.windSpeedKmh.toFixed(1)} km/h` : "-"],
  ];

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
        POGODA
      </span>
      <span
        style={{
          display: "flex",
          fontSize: 44,
          fontWeight: 700,
          marginTop: 12,
        }}
      >
        Warunki zewnętrzne
      </span>
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 28, marginTop: 34 }}
      >
        {values.map(([label, value]) => (
          <div
            key={label}
            style={{ display: "flex", flexDirection: "column", minWidth: 220 }}
          >
            <span
              style={{
                color: "#d16d3f",
                display: "flex",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.1em",
              }}
            >
              {label}
            </span>
            <span
              style={{
                display: "flex",
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
      <div
        style={{
          background:
            "linear-gradient(180deg, #75444d 0%, #967844 45%, #56834c 72%, #325d45 100%)",
          border: "1px solid #68707a",
          display: "flex",
          height: 180,
          marginTop: "auto",
          position: "relative",
          width: "100%",
        }}
      >
        <span
          style={{
            background: "#fffaf0",
            border: "7px solid #151923",
            borderRadius: 999,
            display: "flex",
            height: 28,
            left: weather
              ? `${Math.max(8, Math.min(88, ((weather.apparentTemperatureC + 10) / 45) * 100))}%`
              : "50%",
            position: "absolute",
            top: weather
              ? `${Math.max(12, Math.min(82, 100 - weather.relativeHumidity))}%`
              : "50%",
            width: 28,
          }}
        />
      </div>
    </div>,
    size,
  );
}
