import { getPublicTrainingShareImageFromPostgres } from "@/lib/server/climberbook-repository";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareId: string }> },
) {
  const { shareId } = await params;
  if (!/^[A-Za-z0-9_-]{12}$/.test(shareId))
    return new Response(null, { status: 404 });

  const image = await getPublicTrainingShareImageFromPostgres(shareId);
  if (!image) {
    return Response.redirect(
      new URL(`/share/${shareId}/opengraph-image`, request.url),
    );
  }
  return new Response(new Uint8Array(image.data), {
    headers: {
      "cache-control": "public, immutable, max-age=31536000",
      "content-type": image.contentType,
    },
  });
}
