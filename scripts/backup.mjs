import { DatabaseSync } from "node:sqlite";
import { mkdir, cp, access } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
  console.error(
    "A loja usa PostgreSQL remoto. Faça o backup pelo Supabase, incluindo o schema ocular, e exporte também o bucket ocular-products. O backup SQLite local não representa os dados publicados.",
  );
  process.exit(1);
}
const source = resolve(process.env.OCULAR_DB_PATH || "data/ocular.sqlite");
await access(source);
const dest = resolve("backups", new Date().toISOString().replace(/[:.]/g, "-"));
await mkdir(dest, { recursive: true, mode: 0o700 });
const database = new DatabaseSync(source);
try {
  database.prepare("VACUUM INTO ?").run(join(dest, "ocular.sqlite"));
} finally {
  database.close();
}
try {
  await access(join(dirname(source), "media"));
  await cp(join(dirname(source), "media"), join(dest, "media"), {
    recursive: true,
  });
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
console.log(
  `Backup criado: ${dest}. Valide a restauração em uma instância isolada.`,
);
