import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

const port = Number(process.env.OCULAR_PREVIEW_TEST_PORT || 4011);
const base = `http://localhost:${port}`;
let logs = "";
// package.json is a file: trying to initialize a database here always fails.
// This verifies real page rendering without accidentally using writable /tmp.
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
  {
    env: {
      ...process.env,
      VERCEL: "1",
      OCULAR_DB_PATH: resolve("package.json", "preview.sqlite"),
      OCULAR_SITE_URL: base,
      OCULAR_TELEMETRY_ENABLED: "false",
      OCULAR_INDEXING_ENABLED: "false",
    },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  },
);
child.stdout.on("data", (b) => {
  logs += b;
});
child.stderr.on("data", (b) => {
  logs += b;
});
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null)
      throw new Error("Servidor encerrou durante a inicialização.");
    try {
      if ((await fetch(`${base}/api/catalog`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  assert(ready, "Catálogo de validação não iniciou.");
  const catalog = await (await fetch(`${base}/api/catalog`)).json();
  assert.equal(catalog.products.length, 33);
  assert.equal(catalog.config.paymentsEnabled, false);
  for (const path of [
    "/",
    "/oculos",
    "/produtos/grau",
    "/produtos/sol",
    "/carrinho",
    "/checkout",
    "/lentes",
    "/sitemap.xml",
  ]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    const body = await response.text();
    assert(!body.includes("Application error"), path);
  }
  console.log(
    "OK home, coleções, categorias, carrinho, checkout, lentes e sitemap sem disco gravável",
  );
  for (const p of catalog.products) {
    const response = await fetch(`${base}/produtos/${p.category}/${p.slug}`);
    assert.equal(response.status, 200, p.slug);
    const html = await response.text();
    assert(html.includes('class="store-product-detail"'), p.slug);
    assert(html.includes(p.name.replaceAll("&", "&amp;")), p.slug);
  }
  console.log("OK todas as 33 fichas de produto renderizam em modo Vercel");
  const p = catalog.products[0];
  const response = await fetch(`${base}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({
      items: [{ productId: p.id, variantId: p.variants[0].id, quantity: 1 }],
      customer: {
        name: "Teste preview",
        email: "preview@example.com",
        phone: "41999990000",
      },
      privacyAccepted: true,
      idempotencyKey: randomUUID(),
    }),
  });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal((await response.json()).order, undefined);
  assert.equal((await fetch(`${base}/api/health`)).status, 503);
  console.log(
    "OK persistência indisponível é explícita, sem criar orçamento ou confirmação fictícios",
  );
} catch (error) {
  console.error(error);
  console.error(logs.slice(-5000));
  process.exitCode = 1;
} finally {
  child.kill();
  await new Promise((done) => {
    if (child.exitCode !== null) return done();
    const timer = setTimeout(done, 5000);
    child.once("exit", () => {
      clearTimeout(timer);
      done();
    });
  });
}
