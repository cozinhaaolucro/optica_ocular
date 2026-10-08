import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { rootCertificates } from "node:tls";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { db } from "./db";
import { referenceProducts } from "./catalog-seed";
import { postgresSchema } from "./postgres-schema";
import { supabaseCA } from "./supabase-ca";
import {
  isCatalogPreview,
  PersistenceUnavailableError,
  usesPostgres,
} from "./storage-mode";

type Context = { client?: PoolClient; local?: boolean };
const context = new AsyncLocalStorage<Context>();
let pool: Pool | undefined;
let initialized: Promise<void> | undefined;
let localQueue = Promise.resolve();
const tables =
  "products|orders|events|sessions|rate_limits|notifications|settings";

function remoteSql(sql: string) {
  let parameter = 0;
  return sql
    .replace(/\?/g, () => `$${++parameter}`)
    .replace(
      new RegExp(`\\b(FROM|INTO|UPDATE|JOIN)\\s+(${tables})\\b`, "gi"),
      "$1 ocular.$2",
    );
}

async function withLocalLock<T>(work: () => Promise<T>): Promise<T> {
  const previous = localQueue;
  let release!: () => void;
  localQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await work();
  } finally {
    release();
  }
}

function getPool() {
  if (!pool) {
    const connectionString =
      process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) throw new PersistenceUnavailableError();
    const parsed = new URL(connectionString);
    for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"])
      parsed.searchParams.delete(key);
    // The shared transaction pooler needs unnamed queries and a small local pool.
    pool = new Pool({
      connectionString: parsed.toString(),
      max: 1,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 20000,
      statement_timeout: 15000,
      ssl:
        process.env.OCULAR_DB_SSL === "false" && process.env.VERCEL !== "1"
          ? false
          : {
              rejectUnauthorized: true,
              ca: [
                ...rootCertificates,
                ...(/\.supabase\.(com|co)$/.test(parsed.hostname)
                  ? [supabaseCA]
                  : []),
                ...(process.env.OCULAR_DB_CA
                  ? [process.env.OCULAR_DB_CA.replace(/\\n/g, "\n")]
                  : []),
              ],
            },
    });
    pool.on("error", () => {
      /* The next operation returns a sanitized storage error. */
    });
  }
  return pool;
}

async function initialize() {
  if (!initialized) {
    initialized = (async () => {
      const client = await getPool().connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(730081990)");
        await client.query("SELECT pg_advisory_xact_lock(730081991)");
        await client.query(postgresSchema);
        const count = await client.query(
          "SELECT COUNT(*) AS n FROM ocular.products",
        );
        if (Number(count.rows[0].n) === 0) {
          for (const product of referenceProducts()) {
            await client.query(
              "INSERT INTO ocular.products(id,body) VALUES ($1,$2) ON CONFLICT(id) DO NOTHING",
              [product.id, JSON.stringify(product)],
            );
          }
        }
        await client.query("COMMIT");
      } catch {
        await client.query("ROLLBACK").catch(() => undefined);
        throw new PersistenceUnavailableError();
      } finally {
        client.release();
      }
    })().catch(() => {
      initialized = undefined;
      throw new PersistenceUnavailableError();
    });
  }
  await initialized;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  values: (string | number | null)[] = [],
): Promise<T[]> {
  if (isCatalogPreview()) throw new PersistenceUnavailableError();
  if (usesPostgres()) {
    try {
      const client = context.getStore()?.client;
      if (!client) await initialize();
      return (await (client || getPool()).query<T>(remoteSql(sql), values))
        .rows;
    } catch (error) {
      if (error instanceof PersistenceUnavailableError) throw error;
      throw new PersistenceUnavailableError();
    }
  }
  const work = async () =>
    db()
      .prepare(sql)
      .all(...values) as T[];
  return context.getStore()?.local ? work() : withLocalLock(work);
}

export async function execute(
  sql: string,
  values: (string | number | null)[] = [],
) {
  if (isCatalogPreview()) throw new PersistenceUnavailableError();
  if (usesPostgres()) {
    await query(sql, values);
    return;
  }
  const work = async () => {
    db()
      .prepare(sql)
      .run(...values);
  };
  return context.getStore()?.local ? work() : withLocalLock(work);
}

export async function transaction<T>(work: () => Promise<T>): Promise<T> {
  if (isCatalogPreview()) throw new PersistenceUnavailableError();
  if (context.getStore()) return work();
  if (usesPostgres()) {
    await initialize();
    const client = await getPool()
      .connect()
      .catch(() => {
        throw new PersistenceUnavailableError();
      });
    try {
      await client.query("BEGIN");
      // Serializes store mutations across instances, preserving inventory and revision checks.
      await client.query("SELECT pg_advisory_xact_lock(730081991)");
      const result = await context.run({ client }, work);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      if (error instanceof Error && "code" in error)
        throw new PersistenceUnavailableError();
      throw error;
    } finally {
      client.release();
    }
  }
  return withLocalLock(async () => {
    const conn = db();
    conn.exec(
      "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, body TEXT NOT NULL)",
    );
    conn.exec("BEGIN IMMEDIATE");
    try {
      const result = await context.run({ local: true }, work);
      conn.exec("COMMIT");
      return result;
    } catch (error) {
      conn.exec("ROLLBACK");
      throw error;
    }
  });
}

export async function audit(type: string, body: Record<string, unknown>) {
  await execute("INSERT INTO events(type,body,created) VALUES (?,?,?)", [
    type,
    JSON.stringify(body),
    new Date().toISOString(),
  ]);
}

export async function rateLimit(
  key: string,
  limit: number,
  intervalMs = 60000,
) {
  return transaction(async () => {
    const now = Date.now();
    await execute("DELETE FROM rate_limits WHERE expires<?", [now]);
    const [row] = await query<{ hits: number; expires: number }>(
      "SELECT hits,expires FROM rate_limits WHERE key=?",
      [key],
    );
    if (!row || Number(row.expires) < now) {
      await execute(
        "INSERT INTO rate_limits(key,hits,expires) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET hits=excluded.hits,expires=excluded.expires",
        [key, 1, now + intervalMs],
      );
      return true;
    }
    if (row.hits >= limit) return false;
    await execute("UPDATE rate_limits SET hits=hits+1 WHERE key=?", [key]);
    return true;
  });
}

export async function closePersistence() {
  if (pool) await pool.end();
  pool = undefined;
  initialized = undefined;
}
