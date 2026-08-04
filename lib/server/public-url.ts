export function getPublicOrigin(request: Request) {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? "https";

  if (!host) throw new Error("Brak nagłówka hosta dla publicznego adresu URL.");

  return `${protocol}://${host}`;
}
