export const runtime = "nodejs";

export function GET() {
  const token = process.env.OPENAI_APPS_CHALLENGE_TOKEN?.trim();

  if (!token) {
    return new Response("OpenAI domain verification token is not configured.", {
      status: 404,
    });
  }

  return new Response(token, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
