import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import sharp from "sharp";

const folder = await mkdtemp(join(tmpdir(), "ocular-http-"));
const secret = randomBytes(32).toString("hex");
const port = Number(process.env.OCULAR_TEST_PORT || 4010),
  base = `http://localhost:${port}`;
let logs = "";
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
  {
    env: {
      ...process.env,
      OCULAR_ADMIN_PASSWORD: secret,
      OCULAR_DB_PATH: join(folder, "test.sqlite"),
      OCULAR_SITE_URL: base,
      OCULAR_INDEXING_ENABLED: "false",
      OCULAR_TELEMETRY_ENABLED: "false",
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
const cookies = [];
async function req(path, body, method = "GET", auth = false, origin = base) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(method !== "GET" ? { Origin: origin } : {}),
      ...(auth ? { Cookie: cookies.join("; ") } : {}),
    },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  if (auth)
    for (const value of response.headers.getSetCookie())
      cookies.push(value.split(";")[0]);
  return response;
}
let checks = 0;
async function check(name, fn) {
  await fn();
  checks++;
  console.log(`OK ${name}`);
}
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null)
      throw new Error("O servidor encerrou durante a inicialização.");
    try {
      const r = await req("/api/health");
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  assert(ready, "Servidor não iniciou.");
  await check("catálogo único e cadastro de referência", async () => {
    const r = await req("/api/catalog");
    assert.equal(r.status, 200);
    const d = await r.json();
    assert.equal(d.products.length, 33);
    assert.equal(d.config.paymentsEnabled, false);
    assert(d.products.every((p) => !p.verified));
  });
  const catalog = await (await req("/api/catalog")).json();
  const p = catalog.products[0];
  const body = {
    items: [{ productId: p.id, variantId: p.variants[0].id, quantity: 2 }],
    customer: {
      name: "Teste HTTP",
      email: "http@example.com",
      phone: "41999990000",
    },
    privacyAccepted: true,
    idempotencyKey: randomUUID(),
  };
  let order;
  await check("origem e campos manipulados rejeitados", async () => {
    assert.equal(
      (await req("/api/orders", body, "POST", false, "https://foreign.example"))
        .status,
      400,
    );
    assert.equal(
      (await req("/api/orders", { ...body, totalCents: 1 }, "POST")).status,
      400,
    );
  });
  await check("orçamento protegido e idempotente", async () => {
    const first = await req("/api/orders", body, "POST", true);
    assert.equal(first.status, 201);
    order = (await first.json()).order;
    assert.equal(order.status, "quote_requested");
    assert(first.headers.get("set-cookie").includes("HttpOnly"));
    const retry = await req("/api/orders", body, "POST", true);
    assert.equal((await retry.json()).order.id, order.id);
    assert.equal((await req(`/api/orders/${order.id}`)).status, 404);
    const owned = await req(`/api/orders/${order.id}`, null, "GET", true);
    assert.equal(owned.status, 200);
    const d = await owned.json();
    assert.equal(d.order.totalCents, p.variants[0].priceCents * 2);
    assert.equal("token" in d.order, false);
    assert.equal(owned.headers.get("cache-control"), "no-store");
  });
  await check(
    "admin sem sessão bloqueado; senha e sessão válidas",
    async () => {
      assert.equal((await req("/api/admin/products")).status, 401);
      assert.equal(
        (await req("/api/admin/session", { password: "invalid" }, "POST"))
          .status,
        401,
      );
      assert.equal(
        (await req("/api/admin/session", { password: secret }, "POST", true))
          .status,
        200,
      );
      assert.equal(
        (await req("/api/admin/products", null, "GET", true)).status,
        200,
      );
      const requests = await (
        await req("/api/admin/orders", null, "GET", true)
      ).json();
      assert.equal(requests.orders.length, 1);
      assert.equal(requests.orders[0].id, order.id);
    },
  );
  await check(
    "cadastro incompleto não passa na validação e sessão impede CSRF",
    async () => {
      assert.equal(
        (
          await req(
            "/api/admin/products",
            { ...p, verified: true },
            "PUT",
            true,
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await req(
            "/api/admin/products",
            p,
            "PUT",
            true,
            "https://foreign.example",
          )
        ).status,
        400,
      );
    },
  );
  await check(
    "upload autenticado prepara imagem em 4:3; arquivo inválido é rejeitado",
    async () => {
      const form = new FormData();
      form.set(
        "image",
        new File(
          [
            await sharp({
              create: {
                width: 800,
                height: 600,
                channels: 3,
                background: "#ffffff",
              },
            })
              .jpeg()
              .toBuffer(),
          ],
          "test.jpg",
          { type: "image/jpeg" },
        ),
      );
      const r = await req("/api/admin/media", form, "POST", true);
      assert.equal(r.status, 201);
      const { path } = await r.json();
      const image = await req(path);
      assert.equal(image.status, 200);
      const m = await sharp(Buffer.from(await image.arrayBuffer())).metadata();
      assert.equal(m.width / m.height, 4 / 3);
      const optimized = await req(
        `/_next/image?url=${encodeURIComponent(path)}&w=640&q=75`,
      );
      assert.equal(optimized.status, 200);
      const resized = await sharp(
        Buffer.from(await optimized.arrayBuffer()),
      ).metadata();
      assert.equal(resized.width, 640);
      const invalid = new FormData();
      invalid.set(
        "image",
        new File(["bad"], "bad.jpg", { type: "image/jpeg" }),
      );
      assert.equal(
        (await req("/api/admin/media", invalid, "POST", true)).status,
        400,
      );
      assert.equal((await req("/api/media/not-a-valid-file")).status, 404);
      const disguised = new FormData();
      disguised.set(
        "image",
        new File(
          [
            '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="white"/></svg>',
          ],
          "disguised.jpg",
          { type: "image/jpeg" },
        ),
      );
      assert.equal(
        (await req("/api/admin/media", disguised, "POST", true)).status,
        400,
      );
    },
  );
  await check("rotas de SEO, produtos e estados privados", async () => {
    for (const path of [
      "/",
      "/produtos/grau",
      "/produtos/sol",
      `/produtos/${p.category}/${p.slug}`,
      "/lentes",
      "/carrinho",
      "/checkout",
      "/admin",
      "/privacidade",
      "/entrega",
      "/trocas",
    ])
      assert.equal((await req(path)).status, 200, path);
    const html = await (await req(`/produtos/${p.category}/${p.slug}`)).text();
    const structured = html.match(
      /<script type="application\/ld\+json">([^<]+)<\/script>/,
    );
    assert(structured);
    assert.equal(JSON.parse(structured[1]).offers, undefined);
    assert((await (await req("/robots.txt")).text()).includes("Disallow: /"));
    // Next returns 200 if notFound occurs after streaming has started, with noindex.
    const missing = await req("/produtos/invalid");
    assert([200, 404].includes(missing.status));
    const missingHtml = await missing.text();
    assert(missingHtml.includes("Esta página ou modelo não está disponível."));
    assert(missingHtml.includes("noindex"));
    assert.equal(
      (await req("/api/telemetry", { event: "view_product" }, "POST")).status,
      204,
    );
  });
  await check("saída invalida a sessão", async () => {
    assert.equal(
      (await req("/api/admin/session", null, "DELETE", true)).status,
      200,
    );
    assert.equal(
      (await req("/api/admin/orders", null, "GET", true)).status,
      401,
    );
  });
  console.log(`${checks} verificações HTTP concluídas.`);
} catch (error) {
  console.error(error);
  console.error(logs.slice(-5000));
  process.exitCode = 1;
} finally {
  child.kill();
  await new Promise((resolve) => {
    if (child.exitCode !== null) resolve();
    else {
      child.once("exit", resolve);
      setTimeout(resolve, 5000);
    }
  });
  if (
    dirname(folder) === tmpdir() &&
    folder.split(/[\\/]/).at(-1)?.startsWith("ocular-http-")
  )
    await rm(folder, { recursive: true, force: true });
}
