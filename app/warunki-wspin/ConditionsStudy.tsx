"use client";

import { useEffect, useState } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudRain,
  Droplet,
  Droplets,
  Snowflake,
  Sun,
  Thermometer,
  ThermometerSun,
  Tornado,
  Wind,
} from "lucide-react";
import {
  CONDITIONS_STUDY_SCENARIO_VERSION,
  type ConditionsStudyScenario,
} from "@/lib/conditions-study";
import {
  getHumidityCondition,
  getTemperatureCondition,
  getWindCondition,
} from "@/lib/conditions-study-dictionary";
import styles from "./ConditionsStudy.module.css";

const respondentStorageKey = "climberbook-conditions-study-respondent";
const conditionScores = Array.from({ length: 11 }, (_, index) => index * 10);

type SubmittedAnswer = {
  scenario: ConditionsStudyScenario;
  score: number;
};

type SubmittedAnswerStats = {
  totalCount: number;
  averageScore: number | null;
  scoreStandardDeviation: number | null;
  scoreBands: {
    low: number;
    medium: number;
    high: number;
  };
  coveredScenarioBuckets: number;
  totalScenarioBuckets: number;
};

type ConditionPrediction = {
  estimatedScore: number | null;
  effectiveSampleSize: number;
  responseCount: number;
  probabilities: Array<{ score: number; probability: number }>;
};

function getModelReadiness(totalCount: number) {
  if (totalCount < 100) return `Zbieranie danych (${100 - totalCount} do 100)`;
  if (totalCount < 500) return "Precyzyjne pytania wokół wyuczonego optimum";
  if (totalCount < 1_000)
    return `Rozwijający się zbiór (${1_000 - totalCount} do 1 000)`;
  return "Gotowy do walidacji";
}

function getScoreLabel(score: number) {
  if (score <= 20) return "złe";
  if (score <= 60) return "możliwe";
  if (score <= 90) return "zwyczajne";
  return "epickie";
}

function choose<T>(values: readonly T[]) {
  return values[Math.floor(Math.random() * values.length)];
}

function getWindCategory(windKph: number) {
  if (windKph <= 4) return "calm" as const;
  if (windKph <= 14) return "breeze" as const;
  if (windKph <= 35) return "gusts" as const;
  if (windKph <= 64) return "strong" as const;
  return "halny" as const;
}

type OutdoorWeather = {
  temperatureC: number;
  humidityPercent: number;
  windKph: number;
};

function createOutdoorScenario(
  weather: OutdoorWeather,
): ConditionsStudyScenario {
  return {
    version: CONDITIONS_STUDY_SCENARIO_VERSION,
    source: "geo-weather",
    temperatureC: weather.temperatureC,
    humidityPercent: weather.humidityPercent,
    windKph: weather.windKph,
    windCategory: getWindCategory(weather.windKph),
  };
}

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 8_000,
      maximumAge: 15 * 60 * 1000,
    });
  });
}

function getRespondentId() {
  const existing = window.localStorage.getItem(respondentStorageKey);
  if (existing) return existing;
  const respondentId = crypto.randomUUID();
  window.localStorage.setItem(respondentStorageKey, respondentId);
  return respondentId;
}

const conditionIcons = {
  cloud: Cloud,
  "cloud-drizzle": CloudDrizzle,
  "cloud-rain": CloudRain,
  droplet: Droplet,
  droplets: Droplets,
  snowflake: Snowflake,
  sun: Sun,
  thermometer: Thermometer,
  "thermometer-sun": ThermometerSun,
  tornado: Tornado,
  wind: Wind,
};

export function ConditionsStudy() {
  const [activeTab, setActiveTab] = useState<"learn" | "test">("learn");
  const [scenario, setScenario] = useState<ConditionsStudyScenario | null>(
    null,
  );
  const [score, setScore] = useState<number | null>(null);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [submittedAnswers, setSubmittedAnswers] = useState<SubmittedAnswer[]>(
    [],
  );
  const [submittedAnswerStats, setSubmittedAnswerStats] =
    useState<SubmittedAnswerStats | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [predictionInputs, setPredictionInputs] = useState({
    temperatureC: 18,
    humidityPercent: 50,
    windKph: 8,
  });
  const [prediction, setPrediction] = useState<ConditionPrediction | null>(
    null,
  );
  const [predictionStatus, setPredictionStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [weatherStatus, setWeatherStatus] = useState<
    "loading" | "geo" | "fallback" | "synthetic"
  >("synthetic");

  async function loadSubmittedAnswers() {
    const response = await fetch("/api/conditions-study/responses", {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("responses_unavailable");
    const body = (await response.json()) as {
      responses: SubmittedAnswer[];
      stats: SubmittedAnswerStats;
    };
    setSubmittedAnswers(body.responses);
    setSubmittedAnswerStats(body.stats);
  }

  async function loadPrediction(inputs = predictionInputs) {
    setPredictionStatus("loading");
    try {
      const params = new URLSearchParams({
        temperatureC: String(inputs.temperatureC),
        humidityPercent: String(inputs.humidityPercent),
        windKph: String(inputs.windKph),
      });
      const response = await fetch(
        `/api/conditions-study/prediction?${params}`,
      );
      if (!response.ok) throw new Error("prediction_unavailable");
      setPrediction((await response.json()) as ConditionPrediction);
      setPredictionStatus("idle");
    } catch {
      setPredictionStatus("error");
    }
  }

  async function loadAdaptiveScenario() {
    const params = new URLSearchParams({ respondentId: getRespondentId() });
    const response = await fetch(`/api/conditions-study/scenario?${params}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("scenario_unavailable");
    const body = (await response.json()) as {
      scenario: ConditionsStudyScenario;
    };
    setScenario(body.scenario);
  }

  useEffect(() => {
    void loadAdaptiveScenario().catch(() => undefined);
    void loadSubmittedAnswers().catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPrediction(), 150);
    return () => window.clearTimeout(timer);
  }, [predictionInputs]);

  async function simulateHereAndNow() {
    setWeatherStatus("loading");
    try {
      const position = await getCurrentPosition();
      const params = new URLSearchParams({
        latitude: String(position.coords.latitude),
        longitude: String(position.coords.longitude),
      });
      const response = await fetch(`/api/conditions-study/weather?${params}`);
      if (!response.ok) throw new Error("weather_unavailable");
      const body = (await response.json()) as { weather: OutdoorWeather };
      setScenario(createOutdoorScenario(body.weather));
      setScore(null);
      setWeatherStatus("geo");
    } catch {
      setWeatherStatus("fallback");
    }
  }

  async function submit() {
    if (score === null || !scenario) return;
    setStatus("saving");
    try {
      const response = await fetch("/api/conditions-study/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          respondentId: getRespondentId(),
          scenario,
          score,
        }),
      });
      if (!response.ok) throw new Error("save_failed");

      setSubmittedCount((count) => count + 1);
      await loadSubmittedAnswers();
      await loadPrediction();
      await loadAdaptiveScenario();
      setWeatherStatus("synthetic");
      setScore(null);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  if (!scenario) {
    return (
      <main className={styles.page}>
        <section className={styles.study}>
          <p className={styles.weatherStatus} role="status">
            Przygotowujemy warunki outdoor...
          </p>
        </section>
      </main>
    );
  }

  const temperature = getTemperatureCondition(scenario.temperatureC);
  const humidity = getHumidityCondition(scenario.humidityPercent);
  const wind = getWindCondition(scenario.windKph);
  const TemperatureIcon = conditionIcons[temperature.icon];
  const HumidityIcon = conditionIcons[humidity.icon];
  const WindIcon = conditionIcons[wind.icon];

  return (
    <main className={styles.page}>
      <section className={styles.study} aria-busy={status === "saving"}>
        <header className={styles.header}>
          <p className={styles.brand}>CLIMBERBOOK / BADANIE WARUNKÓW</p>
          <h1>Jak dobre są te warunki na wspin?</h1>
          <p className={styles.intro}>
            Wybierz jeden warun. Nie zbieramy kont, tekstu ani danych osobowych.
          </p>
        </header>

        <div
          className={styles.studyTabs}
          role="tablist"
          aria-label="Tryb badania warunków"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "learn"}
            className={activeTab === "learn" ? styles.studyTabActive : ""}
            onClick={() => setActiveTab("learn")}
          >
            UCZ MODEL
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "test"}
            className={activeTab === "test" ? styles.studyTabActive : ""}
            onClick={() => setActiveTab("test")}
          >
            TESTUJ MODEL
          </button>
        </div>

        <div hidden={activeTab !== "learn"}>
          <p className={styles.weatherStatus} role="status">
            {weatherStatus === "loading"
              ? "Pobieramy aktualną pogodę outdoor dla Twojej lokalizacji..."
              : weatherStatus === "geo"
                ? "Scenariusz korzysta z aktualnej pogody outdoor. Lokalizacja nie jest zapisywana."
                : weatherStatus === "synthetic"
                  ? "Tryb symulacji: losowy scenariusz treningowy."
                  : "Brak zgody na lokalizację lub pogody - pokazujemy wiarygodny scenariusz testowy."}
          </p>
          <button
            type="button"
            className={styles.hereAndNow}
            onClick={() => void simulateHereAndNow()}
            disabled={weatherStatus === "loading"}
          >
            {weatherStatus === "loading"
              ? "Pobieram warunki..."
              : "Symuluj: TERAZ I TU"}
          </button>

          <div className={styles.scenario}>
            <div className={styles.conditionTiles}>
              <article
                className={`${styles.conditionTile} ${styles.temperatureTile} ${styles[temperature.tone]}`}
              >
                <TemperatureIcon aria-hidden="true" strokeWidth={2.2} />
                <span>Temperatura</span>
                <strong>{scenario.temperatureC}°C</strong>
                <small>
                  {temperature.label}: {temperature.detail}
                </small>
              </article>
              <article
                className={`${styles.conditionTile} ${styles.humidityTile} ${styles[humidity.tone]}`}
              >
                <HumidityIcon aria-hidden="true" strokeWidth={2.2} />
                <span>Wilgotność</span>
                <strong>{scenario.humidityPercent}%</strong>
                <small>
                  {humidity.label}: {humidity.detail}
                </small>
              </article>
              <article
                className={`${styles.conditionTile} ${styles.windTile} ${styles[wind.tone]}`}
              >
                <WindIcon aria-hidden="true" strokeWidth={2.2} />
                <span>Wiatr</span>
                <strong>{scenario.windKph} km/h</strong>
                <small>
                  {wind.label}: {wind.detail}
                </small>
              </article>
            </div>
          </div>

          <section className={styles.answer} aria-label="Ocena warunków">
            <p className={styles.question}>Jakie są warunki?</p>
            <div className={styles.conditionAnswers}>
              {conditionScores.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={score === value ? styles.selected : ""}
                  onClick={() => setScore(value)}
                  aria-pressed={score === value}
                >
                  {value}%
                </button>
              ))}
            </div>
            <div className={styles.conditionBands} aria-label="Skala warunków">
              <button
                type="button"
                className={`${styles.bad} ${score === 0 ? styles.bandSelected : ""}`}
                onClick={() => setScore(0)}
                aria-pressed={score === 0}
              >
                ZŁY 0-20%
              </button>
              <button
                type="button"
                className={`${styles.medium} ${score === 40 ? styles.bandSelected : ""}`}
                onClick={() => setScore(40)}
                aria-pressed={score === 40}
              >
                MOŻLIWY 30-60%
              </button>
              <button
                type="button"
                className={`${styles.good} ${score === 70 ? styles.bandSelected : ""}`}
                onClick={() => setScore(70)}
                aria-pressed={score === 70}
              >
                ZWYCZAJNY 70-90%
              </button>
              <button
                type="button"
                className={`${styles.epic} ${score === 100 ? styles.bandSelected : ""}`}
                onClick={() => setScore(100)}
                aria-pressed={score === 100}
              >
                EPIC 90-100%
              </button>
            </div>
          </section>

          {status === "error" ? (
            <p className={styles.error}>
              Nie udało się zapisać odpowiedzi. Spróbuj ponownie.
            </p>
          ) : null}
          <footer className={styles.footer}>
            <span>
              {submittedCount
                ? `Twoje odpowiedzi w tej sesji: ${submittedCount}`
                : ""}
            </span>
            <button
              type="button"
              className={styles.submit}
              onClick={() => void submit()}
              disabled={status === "saving" || score === null}
            >
              {status === "saving"
                ? "Zapisuję..."
                : score === null
                  ? "Wybierz odpowiedź"
                  : "Zapisz i następny scenariusz"}
            </button>
          </footer>
        </div>

        <div hidden={activeTab !== "test"}>
          <section
            className={styles.modelTester}
            aria-label="Tester modelu warunków"
          >
            <div className={styles.modelTesterHeading}>
              <div>
                <p>TESTER MODELU</p>
                <h2>Sprawdź własne warunki</h2>
              </div>
              {prediction?.estimatedScore !== null &&
              prediction?.estimatedScore !== undefined ? (
                <strong>
                  {prediction.estimatedScore.toFixed(1)}%
                  <small>{getScoreLabel(prediction.estimatedScore)}</small>
                </strong>
              ) : null}
            </div>
            <div className={styles.modelTesterFields}>
              <label>
                <span>
                  Temperatura
                  <output>{predictionInputs.temperatureC}°C</output>
                </span>
                <input
                  type="range"
                  min={-10}
                  max={40}
                  step={1}
                  value={predictionInputs.temperatureC}
                  onChange={(event) =>
                    setPredictionInputs((inputs) => ({
                      ...inputs,
                      temperatureC: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                <span>
                  Wilgotność
                  <output>{predictionInputs.humidityPercent}%</output>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={predictionInputs.humidityPercent}
                  onChange={(event) =>
                    setPredictionInputs((inputs) => ({
                      ...inputs,
                      humidityPercent: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                <span>
                  Wiatr
                  <output>{predictionInputs.windKph} km/h</output>
                </span>
                <input
                  type="range"
                  min={0}
                  max={70}
                  step={1}
                  value={predictionInputs.windKph}
                  onChange={(event) =>
                    setPredictionInputs((inputs) => ({
                      ...inputs,
                      windKph: Number(event.target.value),
                    }))
                  }
                />
              </label>
            </div>
            {predictionStatus === "error" ? (
              <p className={styles.modelTesterError}>
                Nie udało się pobrać predykcji.
              </p>
            ) : null}
            {prediction ? (
              <>
                <div
                  className={styles.probabilityChart}
                  aria-label="Rozkład prawdopodobieństwa ocen"
                >
                  {prediction.probabilities.map(
                    ({ score: predictedScore, probability }) => (
                      <div
                        className={styles.probabilityColumn}
                        key={predictedScore}
                      >
                        <span>{(probability * 100).toFixed(0)}%</span>
                        <i
                          style={{
                            height: `${Math.max(probability * 100, 2)}%`,
                          }}
                        />
                        <b>{predictedScore}</b>
                      </div>
                    ),
                  )}
                </div>
                <p className={styles.modelTesterNote}>
                  Rozkład oparty na {prediction.responseCount} odpowiedziach;
                  efektywna liczba podobnych obserwacji:{" "}
                  {prediction.effectiveSampleSize.toFixed(1)}.
                </p>
              </>
            ) : null}
          </section>
        </div>

        <div hidden={activeTab !== "learn"}>
          {submittedAnswers.length ? (
            <section className={styles.submittedAnswers}>
              <h2>Udzielone odpowiedzi</h2>
              {submittedAnswerStats ? (
                <section
                  className={styles.modelStats}
                  aria-label="Stan danych modelu"
                >
                  <div className={styles.modelStatsHeading}>
                    <h3>Stan danych modelu</h3>
                    <span>
                      {getModelReadiness(submittedAnswerStats.totalCount)}
                    </span>
                  </div>
                  <dl className={styles.modelMetrics}>
                    <div>
                      <dt>Odpowiedzi</dt>
                      <dd>{submittedAnswerStats.totalCount}</dd>
                    </div>
                    <div>
                      <dt>Średnia ocena</dt>
                      <dd>
                        {submittedAnswerStats.averageScore?.toFixed(1) ?? "-"}%
                      </dd>
                    </div>
                    <div>
                      <dt>Zmienność ocen</dt>
                      <dd>
                        {submittedAnswerStats.scoreStandardDeviation?.toFixed(
                          1,
                        ) ?? "-"}
                      </dd>
                    </div>
                    <div>
                      <dt>Pokrycie warunków</dt>
                      <dd>
                        {submittedAnswerStats.coveredScenarioBuckets}/
                        {submittedAnswerStats.totalScenarioBuckets}
                      </dd>
                    </div>
                  </dl>
                  <div className={styles.scoreBalance}>
                    <span>Balans ocen</span>
                    {(
                      [
                        [
                          "Niskie 0-30",
                          submittedAnswerStats.scoreBands.low,
                          "low",
                        ],
                        [
                          "Średnie 31-70",
                          submittedAnswerStats.scoreBands.medium,
                          "medium",
                        ],
                        [
                          "Dobre 71-100",
                          submittedAnswerStats.scoreBands.high,
                          "high",
                        ],
                      ] as const
                    ).map(([label, count, tone]) => {
                      const percentage =
                        (count / submittedAnswerStats.totalCount) * 100;
                      return (
                        <div className={styles.scoreBand} key={tone}>
                          <div>
                            <span>{label}</span>
                            <strong>
                              {count} ({percentage.toFixed(0)}%)
                            </strong>
                          </div>
                          <span className={styles.scoreTrack}>
                            <span
                              className={`${styles.scoreFill} ${styles[tone]}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}
              <ol>
                {submittedAnswers.map((answer, index) => (
                  <li
                    key={`${answer.scenario.temperatureC}-${answer.scenario.humidityPercent}-${answer.scenario.windKph}-${index}`}
                  >
                    <strong>{answer.score}%</strong>
                    <span>
                      {answer.scenario.temperatureC}°C (
                      {
                        getTemperatureCondition(answer.scenario.temperatureC)
                          .label
                      }
                      ), {answer.scenario.humidityPercent}% (
                      {
                        getHumidityCondition(answer.scenario.humidityPercent)
                          .label
                      }
                      ), {getWindCondition(answer.scenario.windKph).label} (
                      {answer.scenario.windKph} km/h)
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
