import { DefaultAzureCredential } from "@azure/identity";
import {
  Pool,
  type PoolClient,
  type PoolConfig,
  type QueryResultRow,
} from "pg";

const ENTRA_SCOPE = "https://ossrdbms-aad.database.windows.net/.default";

let pool: Pool | null = null;
let entraToken: { token: string; expiresOnTimestamp: number } | null = null;

function getSslConfig() {
  const sslMode = process.env.POSTGRES_SSLMODE ?? "disable";

  if (sslMode === "disable") {
    return false;
  }

  return { rejectUnauthorized: sslMode === "verify-full" };
}

async function getEntraAccessToken() {
  const now = Date.now();

  if (entraToken && entraToken.expiresOnTimestamp - now > 300_000) {
    return entraToken.token;
  }

  const credential = new DefaultAzureCredential();
  const token = await credential.getToken(ENTRA_SCOPE);

  if (!token) {
    throw new Error("Nie udało się pobrać tokenu Microsoft Entra ID dla PostgreSQL.");
  }

  entraToken = token;
  return token.token;
}

function buildPoolConfig(): PoolConfig {
  const authMode = process.env.POSTGRES_AUTH_MODE ?? "password";

  if (authMode === "entra") {
    return {
      host: process.env.POSTGRES_HOST,
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: getEntraAccessToken,
      ssl: getSslConfig(),
      max: Number(process.env.POSTGRES_POOL_MAX ?? 10),
    };
  }

  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: getSslConfig(),
      max: Number(process.env.POSTGRES_POOL_MAX ?? 10),
    };
  }

  return {
    host: process.env.POSTGRES_HOST ?? "localhost",
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    database: process.env.POSTGRES_DB ?? "climberbook",
    user: process.env.POSTGRES_USER ?? "climberbook_admin",
    password: process.env.POSTGRES_PASSWORD,
    ssl: getSslConfig(),
    max: Number(process.env.POSTGRES_POOL_MAX ?? 10),
  };
}

export function getPostgresPool() {
  if (!pool) {
    pool = new Pool(buildPoolConfig());
  }

  return pool;
}

export async function queryPostgres<T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  return getPostgresPool().query<T>(text, values);
}

export async function withPostgresTransaction<T>(
  action: (client: PoolClient) => Promise<T>,
) {
  const client = await getPostgresPool().connect();

  try {
    await client.query("begin");
    const result = await action(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}