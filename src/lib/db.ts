import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { referenceProducts } from "./catalog-seed";
import { isCatalogPreview, PersistenceUnavailableError } from "./storage-mode";

let connection: DatabaseSync | undefined;
export function db() {
  // A validation deployment can browse the catalog, but must not store customer
  // data or accept admin writes on ephemeral function storage.
  if (isCatalogPreview()) throw new PersistenceUnavailableError();
  if (connection) return connection;
  // This file is runtime data on a persistent volume, never a deployment asset.
  const path = resolve(
    /* turbopackIgnore: true */ process.env.OCULAR_DB_PATH ||
      "data/ocular.sqlite",
  );
  mkdirSync(dirname(path), { recursive: true });
  const conn = new DatabaseSync(path);
  conn.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, token TEXT NOT NULL, idem TEXT UNIQUE NOT NULL, body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, body TEXT NOT NULL, created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, body TEXT NOT NULL, sent INTEGER NOT NULL DEFAULT 0);
  `);
  if (
    !(conn.prepare("SELECT COUNT(*) AS n FROM products").get() as { n: number })
      .n
  ) {
    conn.exec("BEGIN IMMEDIATE");
    try {
      const insert = conn.prepare(
        "INSERT OR IGNORE INTO products VALUES (?,?)",
      );
      for (const product of referenceProducts()) {
        insert.run(product.id, JSON.stringify(product));
      }
      conn.exec("COMMIT");
    } catch (error) {
      conn.exec("ROLLBACK");
      throw error;
    }
  }
  connection = conn;
  return conn;
}
export function transaction<T>(work: () => T): T {
  const conn = db();
  conn.exec("BEGIN IMMEDIATE");
  try {
    const value = work();
    conn.exec("COMMIT");
    return value;
  } catch (error) {
    conn.exec("ROLLBACK");
    throw error;
  }
}
export function audit(type: string, body: Record<string, unknown>) {
  db()
    .prepare("INSERT INTO events(type,body,created) VALUES (?,?,?)")
    .run(type, JSON.stringify(body), new Date().toISOString());
}
export function rateLimit(key: string, limit: number, intervalMs = 60000) {
  return transaction(() => {
    const now = Date.now();
    db().prepare("DELETE FROM rate_limits WHERE expires<?").run(now);
    const row = db()
      .prepare("SELECT hits,expires FROM rate_limits WHERE key=?")
      .get(key) as { hits: number; expires: number } | undefined;
    if (!row || row.expires < now) {
      db()
        .prepare("INSERT OR REPLACE INTO rate_limits VALUES (?,?,?)")
        .run(key, 1, now + intervalMs);
      return true;
    }
    if (row.hits >= limit) return false;
    db().prepare("UPDATE rate_limits SET hits=hits+1 WHERE key=?").run(key);
    return true;
  });
}
