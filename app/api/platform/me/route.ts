import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import { getPlatformUserById } from "@/lib/server/platform-user";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const user = await getPlatformUserById(actorId);
  if (!user) {
    return Response.json(
      { error: "Nie znaleziono profilu użytkownika." },
      { status: 404 },
    );
  }

  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      apps: [
        { id: "climberbook", label: "Climberbook", href: "/trening" },
        {
          id: "alternating-care",
          label: "Alternating Care",
          href: "/alternating-care",
        },
        {
          id: "models",
          label: "Modele",
          href: "/modele",
        },
        {
          id: "maps",
          label: "Maps",
          href: "/maps",
        },
      ],
    },
  });
}
