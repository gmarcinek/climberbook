const POSTGRES_EXPERIMENTAL_API_FLAG = "ENABLE_POSTGRES_EXPERIMENTAL_API";

export function isPostgresExperimentalApiEnabled() {
  return process.env[POSTGRES_EXPERIMENTAL_API_FLAG] === "true";
}

export function postgresExperimentalApiDisabledResponse() {
  return Response.json(
    {
      error:
        "Eksperymentalne API PostgreSQL jest wyłączone. Ustaw ENABLE_POSTGRES_EXPERIMENTAL_API=true wyłącznie w środowisku testowym.",
    },
    { status: 404 },
  );
}