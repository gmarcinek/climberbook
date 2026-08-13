import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPublicTrainingShareFromPostgres } from "@/lib/server/climberbook-repository";
import { PublicTrainingShareSessionChart } from "@/components/training-session/PublicTrainingShareSessionChart";
import { TrainingWeatherConditionMap } from "@/components/training-session/TrainingSessionDetails";
import { getGradeChipClassName } from "@/components/training-session/training-session.utils";
import type { TrainingSurface } from "@/lib/climbs-db";
import previewStyles from "@/components/training-calendar/TrainingSidebar.module.css";
import styles from "./PublicTrainingShare.module.css";

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

function formatWeatherValue(value: number, unit: string) {
  return `${value.toFixed(1)} ${unit}`;
}

function getCompletionColor(completed: number) {
  if (completed <= 0.25) return "#29334f";
  if (completed <= 0.5) return "#7655a8";
  if (completed <= 0.75) return "#e7bc58";
  return "#5cbd8b";
}

const surfaceLabels = {
  lina: "Lina",
  baldy: "Baldy",
  moon: "MoonBoard",
  drazek: "Drążek",
  spraywall: "Spraywall",
  kilter: "Kilter Board",
  silownia: "Siłownia",
  chwytotablica: "Chwytotablica",
  campus: "Campus",
  bieznia: "Bieżnia",
  rower: "Rower",
  bieg: "Bieg",
  treking: "Trekking",
} as const;

async function getPublicOrigin() {
  const configuredOrigin =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL;
  if (configuredOrigin) return new URL(configuredOrigin).origin;

  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareId: string }>;
}): Promise<Metadata> {
  const { shareId } = await params;
  if (!/^[A-Za-z0-9_-]{12}$/.test(shareId)) return {};

  const share = await getPublicTrainingShareFromPostgres(shareId);
  if (!share) return {};

  const origin = await getPublicOrigin();
  const title = `${share.activity} | Climberbook`;
  const description = `${formatDate(share.date)} - ${formatDuration(share.durationMinutes)}${share.facilityName ? `, ${share.facilityName}` : ""}`;
  const shareUrl = `${origin}/share/${share.id}`;
  const chartImageUrl = `${shareUrl}/session-chart-image`;
  const conditionsImageUrl = `${shareUrl}/conditions-image`;

  return {
    title,
    description,
    alternates: { canonical: shareUrl },
    openGraph: {
      type: "article",
      locale: "pl_PL",
      url: shareUrl,
      title,
      description,
      images: [
        { url: chartImageUrl, width: 1200, height: 630, alt: "Wykres sesji" },
        {
          url: conditionsImageUrl,
          width: 1200,
          height: 630,
          alt: "Warunki zewnętrzne",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [chartImageUrl],
    },
  };
}

export default async function PublicTrainingSharePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  if (!/^[A-Za-z0-9_-]{12}$/.test(shareId)) notFound();

  const share = await getPublicTrainingShareFromPostgres(shareId);
  if (!share) notFound();
  const gradeSeries = Object.entries(share.difficultyBySurface ?? {})
    .map(([surface, grades]) => ({
      surfaceKey: surface as TrainingSurface,
      surface: surfaceLabels[surface as keyof typeof surfaceLabels] ?? surface,
      grades: grades
        .split(",")
        .map((grade) => grade.trim())
        .filter(Boolean),
    }))
    .filter(({ grades }) => grades.length > 0);
  const reportedAttempts =
    gradeSeries.reduce((total, { grades }) => total + grades.length, 0) ||
    share.grades.length ||
    (share.attemptsCount > 0 ? share.attemptsCount : null);

  return (
    <main className={styles.page}>
      <article className={styles.drawer}>
        <header className={styles.topBar}>
          <p className={styles.brand}>CLIMBERBOOK</p>
          <Link className={styles.register} href="/login">
            Zaloguj się
          </Link>
        </header>
        <div className={styles.content}>
          <div className={styles.drawerHeader}>
            <div>
              <p className={styles.date}>
                {formatDate(share.date)} - {share.time}
              </p>
              <p className={styles.eyebrow}>Podgląd treningu</p>
              <h1>{share.facilityName || "Nie wskazano"}</h1>
              <h2>{share.activity}</h2>
            </div>
          </div>
          <dl className={styles.details}>
            <div>
              <dt>Czas</dt>
              <dd>{formatDuration(share.durationMinutes)}</dd>
            </div>
            <div className={styles.detailsFull}>
              <dt>Kalorie</dt>
              <dd className={styles.caloriesValue}>
                {share.caloriesBurned} / 1000 kcal
              </dd>
              <div className={styles.caloriesTrack}>
                <div
                  style={{
                    width: `${Math.min(100, share.caloriesBurned / 10)}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <dt>Wiek</dt>
              <dd>{share.ageYears} lat</dd>
            </div>
            <div>
              <dt>Wstawki</dt>
              <dd>{reportedAttempts ?? "Brak danych"}</dd>
            </div>
            {share.wellbeing ? (
              <div className={styles.detailsFull}>
                <dt>Samopoczucie</dt>
                <dd>{share.wellbeing}</dd>
              </div>
            ) : null}
            {share.notes ? (
              <div className={styles.detailsFull}>
                <dt>Notatki</dt>
                <dd>{share.notes}</dd>
              </div>
            ) : null}
          </dl>
          {false && share.ropeRoutes?.length ? (
            <section className={styles.chartSection}>
              <div className={styles.chartHeader}>
                <p className={styles.eyebrow}>Drogi</p>
                <h3>Objętość treningowa</h3>
                <p className={styles.chartDescription}>
                  Procent treningowego przewspinania drogi.
                </p>
              </div>
              <div className={styles.routeChart}>
                {share.ropeRoutes.map((route, index) => (
                  <div key={`${route.ropeWallName}-${route.grade}-${index}`}>
                    <span>
                      {route.ropeWallName} · {route.grade} · Ukończono w
                      zakresie: {Math.round(route.completed * 100)}%
                    </span>
                    <div>
                      <i
                        style={{
                          background: getCompletionColor(route.completed),
                          width: `${Math.min(100, Math.max(0, route.completed * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          {share.surfaces.length ? (
            <section className={styles.chartSection}>
              <div className={styles.chartHeader}>
                <h3>Aktywności</h3>
              </div>
              <div className={styles.activityDetails}>
                {share.surfaces.map((surface) => (
                  <span key={surface}>{surfaceLabels[surface]}</span>
                ))}
                {gradeSeries.map(({ surfaceKey, surface, grades }) => (
                  <span className={styles.gradeGroup} key={surfaceKey}>
                    <em>{surface}</em>
                    <span className={styles.gradeChips}>
                      {grades.map((grade, index) => (
                        <span
                          className={[
                            previewStyles.trainingSidebar__gradeChip,
                            previewStyles.trainingSidebar__gradeSummaryChip,
                            getGradeChipClassName(
                              previewStyles,
                              surfaceKey,
                              grade,
                            ),
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          key={`${grade}-${index}`}
                        >
                          {grade}
                        </span>
                      ))}
                    </span>
                  </span>
                ))}
              </div>
            </section>
          ) : null}
          {share.ropeRoutes?.length ? (
            <section className={styles.chartSection}>
              <div className={styles.chartHeader}>
                <p className={styles.eyebrow}>Drogi</p>
                <h3>Objętość treningowa</h3>
                <p className={styles.chartDescription}>
                  Procent treningowego przewspinania drogi.
                </p>
              </div>
              <div className={styles.routeChart}>
                {share.ropeRoutes.map((route, index) => (
                  <div key={`${route.ropeWallName}-${route.grade}-${index}`}>
                    <span>
                      {route.ropeWallName} · {route.grade} · Ukończono w
                      zakresie: {Math.round(route.completed * 100)}%
                    </span>
                    <div>
                      <i
                        style={{
                          background: getCompletionColor(route.completed),
                          width: `${Math.min(100, Math.max(0, route.completed * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          <div className={styles.shareImage} data-share-image>
            {gradeSeries.length || share.ropeRoutes?.length ? (
              <section className={styles.chartSection}>
                <div className={styles.chartHeader}>
                  <p className={styles.eyebrow}>Wykres sesji</p>
                  <h3>Wyceny na sesję</h3>
                </div>
                <div className={styles.previewChart}>
                  <PublicTrainingShareSessionChart share={share} />
                </div>
              </section>
            ) : null}
            {share.weatherSnapshot ? (
              <section className={styles.chartSection}>
                <div className={styles.chartHeader}>
                  <p className={styles.eyebrow}>Pogoda</p>
                  <h3>Warunki zewnętrzne</h3>
                </div>
                <dl className={styles.weatherDetails}>
                  <div>
                    <dt>Temperatura</dt>
                    <dd>
                      {formatWeatherValue(
                        share.weatherSnapshot.temperatureC,
                        "°C",
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Odczuwalna</dt>
                    <dd>
                      {formatWeatherValue(
                        share.weatherSnapshot.apparentTemperatureC,
                        "°C",
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Wilgotność</dt>
                    <dd>
                      {Math.round(share.weatherSnapshot.relativeHumidity)}%
                    </dd>
                  </div>
                  <div>
                    <dt>Wiatr</dt>
                    <dd>
                      {formatWeatherValue(
                        share.weatherSnapshot.windSpeedKmh,
                        "km/h",
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Opad</dt>
                    <dd>
                      {formatWeatherValue(
                        share.weatherSnapshot.precipitationMm,
                        "mm",
                      )}
                    </dd>
                  </div>
                </dl>
                <div className={styles.weatherMap}>
                  <TrainingWeatherConditionMap
                    weather={share.weatherSnapshot}
                  />
                </div>
              </section>
            ) : null}
          </div>
          <footer className={styles.footer}>
            <span>CLIMBERBOOK</span>
            <Link href="/rejestracja">Załóż konto</Link>
          </footer>
        </div>
      </article>
    </main>
  );
}
