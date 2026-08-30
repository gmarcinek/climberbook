"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChartNoAxesCombined,
  Cloud,
  Droplets,
  Moon,
  Snowflake,
  Sun,
} from "lucide-react";
import { Button } from "@/components/climberbook/common/Button";
import { InformationModalTrigger } from "@/components/climberbook/common/InformationModal";
import { Typeahead } from "@/components/climberbook/common/Typeahead";
import {
  formControlClassNames,
  Input,
  NumericRangeControl,
  NumericStepperControl,
  Select,
} from "@/components/climberbook/common/FormControls";
import { formatDurationMinutes } from "@/components/climberbook/common/training";
import type {
  FacilityRecord,
  TrainingSurface,
  TrainingWeatherSnapshot,
} from "@/lib/climbs-db";
import styles from "@/components/training-calendar/TrainingSidebar.module.css";
import type { SurfaceOption, TrainingDraftValues } from "./types";
import {
  adjustCaloriesValue,
  getSurfaceOptionGroups,
  timeOptions,
} from "./training-session.utils";

const surfaceEmojis: Record<TrainingSurface, string> = {
  lina: "🧗",
  baldy: "🪨",
  moon: "🌙",
  kilter: "💡",
  spraywall: "🎨",
  chwytotablica: "🖐️",
  campus: "🪜",
  drazek: "💪",
  silownia: "🏋️",
  bieznia: "🏃",
  rower: "🚴",
  bieg: "👟",
  treking: "🥾",
};

function getFacilityNameWords(name: string) {
  return new Set(
    name
      .toLocaleLowerCase("pl-PL")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean),
  );
}

function findFacility(
  facilities: FacilityRecord[],
  facilityName: string,
  facilityId?: string,
) {
  if (facilityId) {
    const facility = facilities.find((item) => item.id === facilityId);
    if (facility) return facility;
  }
  const normalizedName = facilityName.trim().toLocaleLowerCase("pl-PL");
  const exactMatch = facilities.find(
    (facility) =>
      facility.name.trim().toLocaleLowerCase("pl-PL") === normalizedName,
  );
  if (exactMatch || !normalizedName) return exactMatch;

  const nameWords = getFacilityNameWords(facilityName);
  return facilities.reduce<FacilityRecord | undefined>(
    (bestMatch, facility) => {
      const sharedWords = [...getFacilityNameWords(facility.name)].filter(
        (word) => nameWords.has(word),
      ).length;
      const bestSharedWords = bestMatch
        ? [...getFacilityNameWords(bestMatch.name)].filter((word) =>
            nameWords.has(word),
          ).length
        : 0;

      return sharedWords > bestSharedWords ? facility : bestMatch;
    },
    undefined,
  );
}

function getWeatherIcon(weatherCode: number, time: string) {
  if (weatherCode > 1) return Cloud;

  const hour = Number(time.slice(0, 2));
  return hour < 6 || hour >= 20 ? Moon : Sun;
}

export function TrainingWeatherConditionMap({
  weather,
}: {
  weather?: TrainingWeatherSnapshot;
}) {
  const plot = { left: 18, top: 20, width: 330, height: 142 };
  const temperatureMin = -10;
  const temperatureMax = 35;
  const humidityMin = 0;
  const humidityMax = 100;
  const x = (temperature: number) =>
    plot.left +
    (Math.max(temperatureMin, Math.min(temperatureMax, temperature)) -
      temperatureMin) *
      (plot.width / (temperatureMax - temperatureMin));
  const y = (humidity: number) =>
    plot.top +
    (humidityMax - Math.max(humidityMin, Math.min(humidityMax, humidity))) *
      (plot.height / (humidityMax - humidityMin));
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  const wind = weather?.windSpeedKmh ?? 6;
  const idealTemperature = 18;
  const idealWindKmh = 3.7;
  const temperatureScore = (temperature: number, humidity: number) => {
    const drynessFactor = clamp((30 - humidity) / 10);
    const temperatureRadius = 8 + drynessFactor * 26;
    return clamp(
      1 - ((temperature - idealTemperature) / temperatureRadius) ** 2,
    );
  };
  const humidityScore = (humidity: number, temperature: number) => {
    const relativeHumidity = Math.max(0, humidity);
    const baseScore = clamp(1 - (relativeHumidity / 65) ** 2);
    const smoothstep = (start: number, end: number, value: number) => {
      const progress = clamp((value - start) / (end - start));
      return progress * progress * (3 - 2 * progress);
    };
    if (temperature <= 0) return 1;

    if (temperature >= idealTemperature) {
      const warmness = Math.min(1, (temperature - idealTemperature) / 17);
      const effectiveHumidity = relativeHumidity * (1 + warmness * 0.9);
      return clamp(1 - (effectiveHumidity / 65) ** 2);
    }

    const dampRockScore = clamp(1 - (1 - baseScore) * 1.3);
    if (temperature < 12) {
      const dampening = smoothstep(0, 12, temperature);
      return 1 - (1 - dampRockScore) * dampening;
    }

    const recovery = smoothstep(12, idealTemperature, temperature);
    return dampRockScore + (baseScore - dampRockScore) * recovery;
  };
  const windScore = (temperature: number, humidity: number) => {
    const breezeScore = clamp(1 - ((wind - idealWindKmh) / 20) ** 2);
    const calmScore =
      temperature <= 15
        ? 1
        : temperature >= 22
          ? humidity > 40
            ? 0.15
            : 0.4
          : 1 - ((temperature - 15) / 7) * 0.6;
    return wind <= 1 ? breezeScore * calmScore : breezeScore;
  };
  const quality = (temperature: number, humidity: number) => {
    const scores = [
      temperatureScore(temperature, humidity),
      humidityScore(humidity, temperature),
      windScore(temperature, humidity),
    ];
    return (
      1 -
      Math.sqrt(
        scores.reduce((sum, score) => sum + (1 - score) ** 2, 0) /
          scores.length,
      )
    );
  };
  const cellWidth = 1;
  const cellHeight = 2;
  const fieldCells = Array.from({ length: 45 * 50 }, (_, index) => {
    const temperature = temperatureMin + (index % 45) * cellWidth;
    const humidity = humidityMin + Math.floor(index / 45) * cellHeight;
    return {
      temperature,
      humidity,
      quality: quality(temperature + 0.5, humidity + 1),
    };
  });
  const optimumThreshold = 0.9;
  const goodConditionsThreshold = 0.8;
  const weakConditionsThreshold = 0.45;
  const optimumAreaRatio =
    fieldCells.filter((cell) => cell.quality >= optimumThreshold).length /
    fieldCells.length;
  const pointX = weather ? x(weather.apparentTemperatureC) : null;
  const pointY = weather ? y(weather.relativeHumidity) : null;
  const target = weather
    ? fieldCells
        .filter((cell) => cell.quality >= optimumThreshold)
        .reduce<{ temperature: number; humidity: number } | null>(
          (closest, cell) => {
            if (!closest) return cell;
            const candidateDistance =
              (cell.temperature - weather.apparentTemperatureC) ** 2 +
              ((cell.humidity - weather.relativeHumidity) / 2) ** 2;
            const closestDistance =
              (closest.temperature - weather.apparentTemperatureC) ** 2 +
              ((closest.humidity - weather.relativeHumidity) / 2) ** 2;
            return candidateDistance < closestDistance ? cell : closest;
          },
          null,
        )
    : null;
  const targetX = target ? x(target.temperature + 0.5) : null;
  const targetY = target ? y(target.humidity + 1) : null;

  return (
    <div className={styles.trainingSidebar__conditionMap}>
      <svg
        viewBox="0 0 360 205"
        role="img"
        aria-label="Diagram stanów warunków wspinaczkowych"
      >
        <defs>
          <marker
            id="condition-vector-arrow"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path
              d="M 0 0 L 6 3 L 0 6 z"
              className={styles.trainingSidebar__conditionMapVector}
            />
          </marker>
        </defs>
        {fieldCells.map((cell) => (
          <rect
            key={`${cell.temperature}-${cell.humidity}`}
            x={x(cell.temperature)}
            y={y(cell.humidity + cellHeight)}
            width={x(cell.temperature + cellWidth) - x(cell.temperature) + 0.2}
            height={y(cell.humidity) - y(cell.humidity + cellHeight) + 0.2}
            className={
              cell.quality >= optimumThreshold
                ? styles.trainingSidebar__conditionMapFieldOptimal
                : cell.quality >= goodConditionsThreshold
                  ? styles.trainingSidebar__conditionMapFieldGood
                  : cell.quality >= weakConditionsThreshold
                    ? styles.trainingSidebar__conditionMapFieldNeutral
                    : styles.trainingSidebar__conditionMapFieldPoor
            }
          />
        ))}
        {[-10, 0, 10, 15, 21, 30, 35].map((temperature) => (
          <g key={temperature}>
            <line
              x1={x(temperature)}
              x2={x(temperature)}
              y1={plot.top}
              y2={plot.top + plot.height}
              className={styles.trainingSidebar__conditionMapGrid}
            />
            <text x={x(temperature)} y="181" textAnchor="middle">
              {temperature}°
            </text>
          </g>
        ))}
        {[0, 30, 60, 100].map((humidity) => (
          <g key={humidity}>
            <line
              x1={plot.left}
              x2={plot.left + plot.width}
              y1={y(humidity)}
              y2={y(humidity)}
              className={styles.trainingSidebar__conditionMapGrid}
            />
            <text
              x="14"
              y={y(humidity) + 3}
              textAnchor="end"
              className={styles.trainingSidebar__conditionMapYAxisTick}
            >
              {humidity}%
            </text>
          </g>
        ))}
        <text x="179" y="200" textAnchor="middle">
          temperatura odczuwalna
        </text>
        <text
          x="18"
          y="12"
          className={styles.trainingSidebar__conditionMapWind}
        >
          {`optimum Q ≥ 90% · pole ${Math.round(optimumAreaRatio * 100)}%`}
        </text>
        <text
          x="348"
          y="12"
          textAnchor="end"
          className={styles.trainingSidebar__conditionMapWind}
        >
          {`wiatr ${wind.toFixed(1)} km/h`}
        </text>
        {pointX !== null && pointY !== null ? (
          <g>
            {targetX !== null && targetY !== null ? (
              <>
                <line
                  x1={pointX}
                  y1={pointY}
                  x2={targetX}
                  y2={targetY}
                  markerEnd="url(#condition-vector-arrow)"
                  className={styles.trainingSidebar__conditionMapVector}
                />
                <circle
                  cx={targetX}
                  cy={targetY}
                  r="4"
                  className={styles.trainingSidebar__conditionMapTarget}
                />
                <text
                  x={targetX - 7}
                  y={targetY + 14}
                  textAnchor="end"
                  className={styles.trainingSidebar__conditionMapTargetLabel}
                >
                  optimum
                </text>
              </>
            ) : null}
            <circle
              cx={pointX}
              cy={pointY}
              r="5"
              className={styles.trainingSidebar__conditionMapPoint}
            />
            <circle
              cx={pointX}
              cy={pointY}
              r="2"
              className={styles.trainingSidebar__conditionMapPointCore}
            />
            <text
              x={pointX + 8}
              y={pointY - 7}
              className={styles.trainingSidebar__conditionMapCurrentLabel}
            >
              odczyt
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}

function WeatherProfileRadar({
  weather,
}: {
  weather?: TrainingWeatherSnapshot;
}) {
  const chart = { x: 58, y: 52, width: 336, height: 164 };
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  const interpolate = (value: number, points: readonly [number, number][]) => {
    const segment = points.find(([, score], index) => {
      const next = points[index + 1];
      return next !== undefined && value <= next[0] && score !== undefined;
    });
    if (!segment) return points.at(-1)?.[1] ?? 0;
    const index = points.indexOf(segment);
    const next = points[index + 1];
    if (!next) return segment[1];
    const progress = (value - segment[0]) / (next[0] - segment[0]);
    return segment[1] + progress * (next[1] - segment[1]);
  };
  const temperatureScore = (value: number) =>
    clamp(
      interpolate(value, [
        [-20, 0.03],
        [-10, 0.08],
        [0, 0.3],
        [10, 0.65],
        [15, 1],
        [21, 1],
        [26, 0.75],
        [30, 0.45],
        [40, 0.08],
      ]),
    );
  const humidityScore = (value: number) => {
    const humidity = Math.max(0, value);
    if (humidity <= 30) return 1;
    return clamp(1 - ((humidity - 30) / 45) ** 2);
  };
  const windScore = (value: number) => {
    const temperature = weather?.apparentTemperatureC ?? 18;
    const humidity = weather?.relativeHumidity ?? 30;
    const calmScore =
      temperature <= 15
        ? 1
        : temperature >= 22
          ? humidity > 40
            ? 0.15
            : 0.4
          : 1 - ((temperature - 15) / 7) * 0.6;

    if (value <= 2) return calmScore + (1 - calmScore) * (value / 2);
    if (value <= 10) return 1;
    return clamp(1 - ((value - 10) / 30) * 0.8);
  };
  const curves = [
    {
      label: "Temperatura odczuwalna",
      detail: weather
        ? `${weather.apparentTemperatureC.toFixed(1)}°C · optimum 15–21°C`
        : "brak danych",
      value: weather?.apparentTemperatureC,
      min: -20,
      max: 40,
      ticks: [-10, 0, 10, 15, 21, 30, 40],
      score: temperatureScore,
      className: styles.trainingSidebar__weatherCurveTemperature,
    },
    {
      label: "Wilgotność",
      detail: weather
        ? `${Math.round(weather.relativeHumidity)}% · optimum do 30%`
        : "brak danych",
      value: weather?.relativeHumidity,
      min: 0,
      max: 100,
      ticks: [0, 20, 40, 60, 100],
      score: humidityScore,
      className: styles.trainingSidebar__weatherCurveHumidity,
    },
    {
      label: "Wiatr",
      detail: weather
        ? `${weather.windSpeedKmh.toFixed(1)} km/h`
        : "brak danych",
      value: weather?.windSpeedKmh,
      min: 0,
      max: 40,
      ticks: [0, 2, 10, 20, 40],
      score: windScore,
      className: styles.trainingSidebar__weatherCurveWind,
    },
  ];
  const x = (progress: number) => chart.x + progress * chart.width;
  const y = (score: number) => chart.y + (1 - score) * chart.height;
  const conditionVector = weather
    ? [
        temperatureScore(weather.apparentTemperatureC),
        humidityScore(weather.relativeHumidity),
        windScore(weather.windSpeedKmh),
      ]
    : null;
  const distanceFromOptimal = conditionVector
    ? Math.sqrt(
        conditionVector.reduce((sum, score) => sum + (1 - score) ** 2, 0) /
          conditionVector.length,
      )
    : null;
  const combinedOptimality =
    distanceFromOptimal === null ? null : 1 - distanceFromOptimal;

  return (
    <div className={styles.trainingSidebar__weatherRadar}>
      <svg
        viewBox="0 0 420 258"
        role="img"
        aria-label="Krzywe optymalności warunków zewnętrznych"
      >
        <defs>
          <marker
            id="weather-vector-arrow"
            markerWidth="5"
            markerHeight="5"
            refX="4"
            refY="2.5"
            orient="auto"
          >
            <path
              d="M 0 0 L 5 2.5 L 0 5 z"
              className={styles.trainingSidebar__weatherCurveAggregate}
            />
          </marker>
        </defs>
        <text
          x="14"
          y="154"
          transform="rotate(-90 14 154)"
          className={styles.trainingSidebar__weatherCurveAxisLabel}
        >
          poziom optymalności
        </text>
        {[0, 0.25, 0.5, 0.75, 1].map((level) => (
          <g key={level}>
            <line
              x1={chart.x}
              y1={y(level)}
              x2={chart.x + chart.width}
              y2={y(level)}
              className={styles.trainingSidebar__weatherRadarGrid}
            />
            <text
              x={chart.x - 8}
              y={y(level) + 2.5}
              textAnchor="end"
              className={styles.trainingSidebar__weatherCurveTick}
            >
              {Math.round(level * 100)}
            </text>
          </g>
        ))}
        {combinedOptimality !== null && distanceFromOptimal !== null ? (
          <g>
            <line
              x1={chart.x}
              y1={y(combinedOptimality)}
              x2={chart.x + chart.width}
              y2={y(combinedOptimality)}
              className={styles.trainingSidebar__weatherCurveAggregate}
            />
            <circle
              cx={chart.x + chart.width}
              cy={y(combinedOptimality)}
              r="4"
              className={styles.trainingSidebar__weatherCurveAggregatePoint}
            />
            <line
              x1="408"
              y1={y(combinedOptimality)}
              x2="408"
              y2={chart.y + 4}
              markerEnd="url(#weather-vector-arrow)"
              className={styles.trainingSidebar__weatherCurveAggregate}
            />
            <text
              x={chart.x + chart.width - 8}
              y={Math.max(chart.y + 10, y(combinedOptimality) - 6)}
              textAnchor="end"
              className={styles.trainingSidebar__weatherCurveAggregateLabel}
            >
              {`Łącznie ${Math.round(combinedOptimality * 100)}% · dystans ${Math.round(distanceFromOptimal * 100)}%`}
            </text>
          </g>
        ) : null}
        {curves.map((curve, curveIndex) => {
          const legend = [
            { x: 58, textAnchor: "start" as const },
            { x: 190, textAnchor: "start" as const },
            { x: 394, textAnchor: "end" as const },
          ][curveIndex];
          const samples = Array.from(
            { length: 61 },
            (_, index) => curve.min + (index / 60) * (curve.max - curve.min),
          );
          const path = samples
            .map(
              (sample, index) =>
                `${index === 0 ? "M" : "L"}${x(index / 60)},${y(curve.score(sample))}`,
            )
            .join(" ");
          const markerValue =
            curve.value === undefined
              ? undefined
              : Math.max(curve.min, Math.min(curve.max, curve.value));
          return (
            <g key={curve.label}>
              <text
                x={legend.x}
                y="18"
                textAnchor={legend.textAnchor}
                className={styles.trainingSidebar__weatherRadarLabel}
              >
                {curve.label}
              </text>
              <text
                x={legend.x}
                y="29"
                textAnchor={legend.textAnchor}
                className={styles.trainingSidebar__weatherRadarValue}
              >
                {curve.detail}
              </text>
              <path d={path} className={curve.className} />
              {markerValue !== undefined ? (
                <circle
                  cx={x((markerValue - curve.min) / (curve.max - curve.min))}
                  cy={y(curve.score(markerValue))}
                  r="3.5"
                  className={styles.trainingSidebar__weatherRadarPoint}
                />
              ) : null}
            </g>
          );
        })}
        <text
          x={chart.x}
          y="237"
          className={styles.trainingSidebar__weatherCurveTick}
        >
          Temperatura: -20–40°C
        </text>
        <text
          x="200"
          y="237"
          className={styles.trainingSidebar__weatherCurveTick}
        >
          Wilgotność: 0–100%
        </text>
        <text
          x={chart.x}
          y="249"
          className={styles.trainingSidebar__weatherCurveTick}
        >
          Wiatr: 0–40 km/h
        </text>
        {conditionVector ? (
          <text
            x="200"
            y="249"
            className={styles.trainingSidebar__weatherCurveTick}
          >
            {`v = (${conditionVector.map((score) => Math.round(score * 100)).join(", ")}) → (100, 100, 100)`}
          </text>
        ) : null}
      </svg>
    </div>
  );
}

type Props = {
  draft: TrainingDraftValues;
  surfaceOptions: SurfaceOption[];
  facilities: FacilityRecord[];
  onDraftChange: (draft: TrainingDraftValues) => void;
  onToggleSurface: (surface: TrainingSurface) => void;
};

export function TrainingSessionDetails({
  draft,
  surfaceOptions,
  facilities,
  onDraftChange,
  onToggleSurface,
}: Props) {
  const [isCustomSessionExpanded, setIsCustomSessionExpanded] = useState(false);
  const [isConditionMapExpanded, setIsConditionMapExpanded] = useState(false);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [weatherRequestKey, setWeatherRequestKey] = useState<string | null>(
    null,
  );
  const [defaultFacilityName, setDefaultFacilityName] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (window.localStorage.getItem("climberbook:defaultFacilityName") ?? ""),
  );
  const groups = getSurfaceOptionGroups(surfaceOptions);
  const facilityOptions = Array.from(
    new Map(
      facilities.map((facility) => [
        facility.id,
        {
          value: facility.id,
          label: `${facility.isOwnedByCurrentUser ? "★ " : ""}${facility.name} (v${facility.currentVersion})`,
        },
      ]),
    ).values(),
  ).sort((left, right) => left.value.localeCompare(right.value, "pl"));
  const update = (changes: Partial<TrainingDraftValues>) =>
    onDraftChange({ ...draft, ...changes });
  const selectedFacility = findFacility(
    facilities,
    draft.facilityName,
    draft.facilityId,
  );
  const canFetchWeather =
    selectedFacility?.latitude !== null &&
    selectedFacility?.latitude !== undefined &&
    selectedFacility?.longitude !== null &&
    selectedFacility?.longitude !== undefined;
  const hasAirConditioning =
    selectedFacility?.capabilities.hasAirConditioning === true;
  const currentWeatherRequestKey = selectedFacility
    ? `${selectedFacility.id}:${draft.date}:${draft.time}`
    : null;
  const currentWeatherRequestKeyRef = useRef(currentWeatherRequestKey);
  currentWeatherRequestKeyRef.current = currentWeatherRequestKey;
  const fetchWeather = async () => {
    if (!canFetchWeather || !selectedFacility) return;

    const requestedWeatherKey = currentWeatherRequestKey;
    setWeatherRequestKey(requestedWeatherKey);
    setIsLoadingWeather(true);
    try {
      const query = new URLSearchParams({
        date: draft.date,
        time: draft.time,
        latitude: String(selectedFacility.latitude),
        longitude: String(selectedFacility.longitude),
      });
      const response = await fetch(`/api/weather?${query}`);
      const result = (await response.json()) as
        | { weather: TrainingWeatherSnapshot }
        | { error: string };
      if (!response.ok || !("weather" in result)) {
        throw new Error(
          "error" in result ? result.error : "Nie udało się pobrać pogody.",
        );
      }
      if (currentWeatherRequestKeyRef.current !== requestedWeatherKey) return;
      update({
        weatherSnapshot: result.weather,
      });
    } catch {
      // Weather is optional; retain the training form when the provider is unavailable.
    } finally {
      setIsLoadingWeather(false);
    }
  };
  useEffect(() => {
    if (
      !canFetchWeather ||
      draft.weatherSnapshot ||
      weatherRequestKey === currentWeatherRequestKey
    ) {
      return;
    }
    void fetchWeather();
  }, [
    canFetchWeather,
    currentWeatherRequestKey,
    draft.weatherSnapshot,
    fetchWeather,
    weatherRequestKey,
  ]);
  const WeatherIcon = draft.weatherSnapshot
    ? getWeatherIcon(
        draft.weatherSnapshot.wmo_code_wether ??
          draft.weatherSnapshot.weatherCode ??
          0,
        draft.time,
      )
    : null;
  const renderSurfaceOptions = (options: SurfaceOption[]) =>
    options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onToggleSurface(option.value)}
        className={[
          styles.trainingSidebar__chip,
          styles.trainingSidebar__sessionChip,
          draft.surfaces.includes(option.value)
            ? styles["trainingSidebar__chip--active"]
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={option.label}
      >
        <span
          className={styles.trainingSidebar__sessionChipIcon}
          aria-hidden="true"
        >
          {surfaceEmojis[option.value]}
        </span>
        <span>{option.label}</span>
      </button>
    ));

  return (
    <div
      className={`${styles.trainingSidebar__stack} ${styles.trainingSidebar__formSectionStack}`}
    >
      <div className={styles.trainingSidebar__stack}>
        <label className={styles.trainingSidebar__field}>
          Obiekt
          <Typeahead
            ariaLabel="Szukaj obiektu"
            value={draft.facilityName}
            selectedLabel={
              selectedFacility
                ? `${selectedFacility.isOwnedByCurrentUser ? "★ " : ""}${selectedFacility.name}`
                : undefined
            }
            options={facilityOptions}
            onChange={(facilityId) => {
              const facility = facilities.find(
                (item) => item.id === facilityId,
              );
              setWeatherRequestKey(null);
              update({
                facilityName: facility?.name ?? facilityId,
                facilityId: facility?.id,
                facilityVersion: facility?.currentVersion,
                weatherSnapshot: undefined,
                ropeWallName: "",
              });
            }}
            placeholder="Szukaj obiektu"
            inputClassName={styles.trainingSidebar__input}
          />
        </label>
        {draft.facilityName ? (
          <Button
            type="button"
            size="small"
            variant="primary"
            className={styles.trainingSidebar__defaultFacilityButton}
            onClick={() => {
              window.localStorage.setItem(
                "climberbook:defaultFacilityName",
                draft.facilityName,
              );
              setDefaultFacilityName(draft.facilityName);
            }}
          >
            {defaultFacilityName === draft.facilityName
              ? "Domyślny obiekt"
              : "Make Default"}
          </Button>
        ) : null}
      </div>
      <div className={styles.trainingSidebar__stack}>
        <strong className={styles.trainingSidebar__protocolHeading}>
          Rodzaj sesji
        </strong>
        <div className={styles.trainingSidebar__sessionChipGrid}>
          {renderSurfaceOptions(groups.primary)}
        </div>
        <div className={styles.trainingSidebar__sessionChipGrid}>
          {renderSurfaceOptions(groups.secondary)}
        </div>
        <div className={styles.trainingSidebar__sessionChipGrid}>
          {renderSurfaceOptions(groups.remaining)}
          <button
            type="button"
            aria-expanded={
              isCustomSessionExpanded || Boolean(draft.customSessionType)
            }
            onClick={() => setIsCustomSessionExpanded((expanded) => !expanded)}
            className={[
              styles.trainingSidebar__chip,
              styles.trainingSidebar__sessionChip,
              isCustomSessionExpanded || draft.customSessionType
                ? styles["trainingSidebar__chip--active"]
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span
              className={styles.trainingSidebar__sessionChipIcon}
              aria-hidden="true"
            >
              ✨
            </span>
            <span>Inne</span>
          </button>
        </div>
        {(isCustomSessionExpanded || draft.customSessionType) && (
          <label className={styles.trainingSidebar__field}>
            Inne
            <Input
              value={draft.customSessionType}
              onChange={(event) =>
                update({ customSessionType: event.target.value })
              }
              placeholder="Np. mobility, joga, regeneracja"
              className={styles.trainingSidebar__input}
            />
          </label>
        )}
      </div>
      <div className={styles.trainingSidebar__formGrid}>
        <label className={styles.trainingSidebar__field}>
          Data
          <Input
            value={draft.date}
            onChange={(event) =>
              update({ date: event.target.value, weatherSnapshot: undefined })
            }
            type="date"
            required
            className={styles.trainingSidebar__input}
          />
        </label>
        <label className={styles.trainingSidebar__field}>
          Godzina
          <Select
            value={draft.time}
            onChange={(event) =>
              update({ time: event.target.value, weatherSnapshot: undefined })
            }
            required
            className={styles.trainingSidebar__input}
          >
            {timeOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </Select>
        </label>
        {draft.weatherSnapshot ? (
          <div
            className={`${styles.trainingSidebar__weatherSummary} ${styles["trainingSidebar__field--full"]}`}
          >
            <div className={styles.trainingSidebar__weatherTile}>
              <div className={styles.trainingSidebar__weatherTileHeader}>
                <span>Temperatura</span>
                <span className={styles.trainingSidebar__weatherIcons}>
                  {WeatherIcon ? (
                    <WeatherIcon size={16} aria-hidden="true" />
                  ) : null}
                  {hasAirConditioning ? (
                    <span aria-label="Klimatyzacja" title="Klimatyzacja">
                      <Snowflake size={16} aria-hidden="true" />
                    </span>
                  ) : null}
                </span>
              </div>
              <strong>
                {draft.weatherSnapshot.temperatureC.toFixed(1)}°C
                <small>
                  odcz. {draft.weatherSnapshot.apparentTemperatureC.toFixed(1)}
                  °C
                </small>
              </strong>
            </div>
            <div className={styles.trainingSidebar__weatherTile}>
              <div className={styles.trainingSidebar__weatherTileHeader}>
                <span>Wilgotność</span>
                <Droplets size={16} aria-hidden="true" />
              </div>
              <strong>
                {draft.weatherSnapshot.relativeHumidity.toFixed(0)}%
              </strong>
            </div>
          </div>
        ) : null}
        <label className={styles.trainingSidebar__field}>
          Czas
          <NumericRangeControl
            value={draft.durationMinutes}
            onChange={(event) =>
              update({ durationMinutes: event.target.value })
            }
            min="15"
            max="300"
            step="15"
            ariaLabel="Długość treningu"
            valueLabel={formatDurationMinutes(draft.durationMinutes)}
            className={styles.trainingSidebar__durationControl}
          />
        </label>
        <label className={styles.trainingSidebar__field}>
          Kalorie (estymacja)
          <NumericStepperControl
            value={draft.caloriesBurned}
            onChange={(event) =>
              update({
                caloriesBurned: event.target.value,
                caloriesMode: "manual",
              })
            }
            onDecrement={() =>
              update({
                caloriesBurned: adjustCaloriesValue(draft.caloriesBurned, -100),
                caloriesMode: "manual",
              })
            }
            onIncrement={() =>
              update({
                caloriesBurned: adjustCaloriesValue(draft.caloriesBurned, 100),
                caloriesMode: "manual",
              })
            }
            decrementAriaLabel="Odejmij 100 kalorii"
            incrementAriaLabel="Dodaj 100 kalorii"
            decrementTitle="Odejmij 100 kalorii"
            incrementTitle="Dodaj 100 kalorii"
            trailingActions={
              <button
                type="button"
                onClick={() =>
                  update({ caloriesBurned: "", caloriesMode: "auto" })
                }
                className={formControlClassNames.stepButton}
              >
                Auto
              </button>
            }
            inputProps={{
              placeholder: "Auto z wagi, wieku i czasu",
              type: "number",
            }}
            className={styles.trainingSidebar__controlGroup}
          />
        </label>
        <label className={styles.trainingSidebar__field}>
          <span className={styles.trainingSidebar__labelWithInfo}>
            Główny cel
            <InformationModalTrigger topic="trainingFocus" />
          </span>
          <Select
            value={draft.focus}
            onChange={(event) =>
              update({
                focus: event.target.value as TrainingDraftValues["focus"],
              })
            }
            className={styles.trainingSidebar__input}
          >
            <option value="none">Brak dominującego celu</option>
            <option value="strength">Siła</option>
            <option value="specific_endurance">Wytrzymałość specyficzna</option>
            <option value="strength_endurance">Wytrzymałość siłowa</option>
            <option value="finger_strength">Specyficzna siła palców</option>
            <option value="contact_strength">Siła kontaktowa</option>
            <option value="volume">Objętość</option>
            <option value="intervals">Interwały</option>
            <option value="general_conditioning">Ogólnorozwojówka</option>
          </Select>
        </label>
        <div className={styles.trainingSidebar__conditionField}>
          <span>Warunki subiektywne</span>
          <div className={styles.trainingSidebar__conditionControl}>
            <Select
              value={draft.conditions}
              onChange={(event) =>
                update({
                  conditions: event.target
                    .value as TrainingDraftValues["conditions"],
                  conditionsWasSetManually: true,
                })
              }
              className={styles.trainingSidebar__input}
            >
              <option value="frosty">Mroźnie</option>
              <option value="cold">Zimno</option>
              <option value="cool">Chłodno</option>
              <option value="optimal">Optymalnie</option>
              <option value="too_warm">Za ciepło</option>
              <option value="stuffy">Zaduch</option>
              <option value="burdensome">Uciążliwie</option>
              <option value="other">Inne</option>
            </Select>
            <button
              type="button"
              className={styles.trainingSidebar__conditionDetailsButton}
              onClick={() => setIsConditionMapExpanded((expanded) => !expanded)}
              aria-expanded={isConditionMapExpanded}
              aria-controls="weather-profile"
              title="Pokaż profil pogody"
            >
              <ChartNoAxesCombined size={24} aria-hidden="true" />
            </button>
          </div>
        </div>
        {isConditionMapExpanded ? (
          <div
            id="weather-profile"
            className={`${styles.trainingSidebar__conditionMapPanel} ${styles["trainingSidebar__field--full"]}`}
          >
            <strong className={styles.trainingSidebar__weatherRadarHeading}>
              <span>Warunki zewnętrzne</span>
              <InformationModalTrigger topic="outdoorConditions" />
            </strong>
            <TrainingWeatherConditionMap weather={draft.weatherSnapshot} />
          </div>
        ) : null}
        {canFetchWeather && !draft.weatherSnapshot ? (
          <div
            className={`${styles.trainingSidebar__metaLine} ${styles["trainingSidebar__field--full"]}`}
          >
            <Button
              type="button"
              size="small"
              variant="secondary"
              onClick={() => void fetchWeather()}
              disabled={isLoadingWeather}
              className={styles.trainingSidebar__weatherFetch}
            >
              Pobierz dane pogodowe
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
