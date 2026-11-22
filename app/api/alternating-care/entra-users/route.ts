import { authOptions } from "@/lib/server/auth-options";
import { DefaultAzureCredential } from "@azure/identity";
import { getServerSession } from "next-auth";

export const runtime = "nodejs";

type GraphUser = {
  id: string;
  displayName?: string | null;
  mail?: string | null;
  userPrincipalName?: string | null;
};

const GRAPH_SCOPE = "https://graph.microsoft.com/.default";
let credential: DefaultAzureCredential | null = null;

export async function GET(request: Request) {
  if (process.env.AUTH_SECRET) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json(
        { error: "Wymagane jest zalogowanie." },
        { status: 401 },
      );
    }
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return Response.json({ users: [] });
  }

  try {
    credential ??= new DefaultAzureCredential();
    const token = await Promise.race([
      credential.getToken(GRAPH_SCOPE),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Microsoft Entra authentication timed out.")),
          10_000,
        ),
      ),
    ]);
    if (!token) {
      throw new Error("Microsoft Graph did not return an access token.");
    }

    const escapedQuery = query.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
    const search = `"displayName:${escapedQuery}" OR "mail:${escapedQuery}" OR "userPrincipalName:${escapedQuery}"`;
    const graphUrl = new URL("https://graph.microsoft.com/v1.0/users");
    graphUrl.searchParams.set("$search", search);
    graphUrl.searchParams.set(
      "$select",
      "id,displayName,mail,userPrincipalName",
    );
    graphUrl.searchParams.set("$top", "8");

    const response = await fetch(graphUrl, {
      headers: {
        authorization: `Bearer ${token.token}`,
        ConsistencyLevel: "eventual",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      const details = await response.text();
      console.error(
        `Microsoft Graph user search failed (${response.status}): ${details}`,
      );
      return Response.json(
        {
          error:
            "Wyszukiwanie kont Entra nie jest dostępne. Sprawdź uprawnienie Microsoft Graph User.Read.All.",
        },
        { status: response.status === 403 ? 503 : 502 },
      );
    }

    const data = (await response.json()) as { value?: GraphUser[] };
    return Response.json({
      users: (data.value ?? []).map((graphUser) => ({
        id: graphUser.id,
        displayName:
          graphUser.displayName?.trim() ||
          graphUser.mail?.trim() ||
          graphUser.userPrincipalName?.trim() ||
          "Użytkownik Entra",
        email: graphUser.mail ?? graphUser.userPrincipalName ?? null,
      })),
    });
  } catch (error) {
    console.error("Microsoft Entra user search is unavailable.", error);
    return Response.json(
      {
        error:
          "Połączenie z Microsoft Entra nie jest skonfigurowane dla tej aplikacji.",
      },
      { status: 503 },
    );
  }
}
