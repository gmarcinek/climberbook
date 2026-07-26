export function isPostgresExperimentalApiEnabled() {
  return true;
}

export function postgresExperimentalApiDisabledResponse() {
  return Response.json(
    {
      error:
        "API PostgreSQL nie jest dostępne.",
    },
    { status: 404 },
  );
}