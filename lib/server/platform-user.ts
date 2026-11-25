import { queryPostgres } from "@/lib/server/postgres";

export type PlatformUser = {
  id: string;
  email: string;
  name: string;
  role: "member" | "admin";
};

export async function getPlatformUserById(
  actorId: string,
): Promise<PlatformUser | null> {
  const result = await queryPostgres<{
    id: string;
    email: string;
    display_name: string;
    access_role: "member" | "admin";
  }>(
    `
      select id, email, display_name, access_role
      from app_users
      where id = $1
    `,
    [actorId],
  );
  const user = result.rows[0];

  return user
    ? {
        id: user.id,
        email: user.email,
        name: user.display_name?.trim() || nameFromEmail(user.email),
        role: user.access_role,
      }
    : null;
}

// "grzegorz.marcinek+tag@example.com" -> "Grzegorz Marcinek"
export function nameFromEmail(email: string) {
  const localPart = (email ?? "").split("@")[0]?.split("+")[0] ?? "";
  return localPart
    .split(/[._-]+/)
    .map((part) => part.replace(/\d+/g, ""))
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
