import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import seed from "@/data/products-data.json";
import type { Product } from "./types";

let connection: DatabaseSync | undefined;
export function db() {
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
      for (const p of seed.products) {
        const product: Product = {
          revision: 0,
          id: p.id,
          slug: p.slug,
          name: p.name,
          brand: p.brand,
          category: p.category as Product["category"],
          description: p.description,
          material: "",
          features: p.features,
          tags: p.tags,
          images: [],
          verified: false,
          priceConfirmed: false,
          published: true,
          package: null,
          variants: [
            {
              id: `${p.id}-default`,
              sku: "",
              label: "Modelo a confirmar",
              color: "",
              lensWidth: null,
              bridge: null,
              temple: null,
              priceCents: Math.round(p.price * 100),
              stock: 0,
            },
          ],
        };
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
