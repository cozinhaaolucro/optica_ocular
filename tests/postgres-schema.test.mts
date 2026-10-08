import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { postgresSchema } from "../src/lib/postgres-schema";

test("Postgres migration is repeatable and denies anonymous access to all private tables", async () => {
  const database = new PGlite();
  try {
    await database.exec("CREATE ROLE anon; CREATE ROLE authenticated;");
    await database.exec(postgresSchema);
    await database.exec(postgresSchema);
    const result = await database.query<{ relrowsecurity: boolean }>(
      "SELECT relrowsecurity FROM pg_class WHERE relnamespace='ocular'::regnamespace AND relkind='r'",
    );
    assert.equal(result.rows.length, 7);
    assert(result.rows.every((row) => row.relrowsecurity));
    for (const role of ["anon", "authenticated"]) {
      const grants = await database.query<{ allowed: boolean }>(
        "SELECT has_schema_privilege($1,'ocular','USAGE') AS allowed",
        [role],
      );
      assert.equal(grants.rows[0].allowed, false);
      await database.exec(`SET ROLE ${role}`);
      await assert.rejects(
        () => database.query("SELECT * FROM ocular.orders"),
        /permission denied/,
      );
      await database.exec("RESET ROLE");
    }
  } finally {
    await database.close();
  }
});
