import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
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
      DATABASE_URL: "",
      POSTGRES_URL: "",
      VERCEL: "0",
      OCULAR_CATALOG_PREVIEW: "false",
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
  let uploadedImage;
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
      uploadedImage = path;
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
  await check(
    "feeds públicos não exportam exemplos; links e preparo ficam no admin",
    async () => {
      for (const name of ["google", "meta"]) {
        const response = await req(`/feeds/${name}.xml`);
        assert.equal(response.status, 200);
        assert(
          response.headers.get("content-type").includes("application/xml"),
        );
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.equal(response.headers.get("x-catalog-items"), "0");
        const xml = await response.text();
        assert(xml.startsWith('<?xml version="1.0"'));
        assert(!xml.includes("<item>"));
      }
      const d = await (
        await req("/api/admin/dashboard", null, "GET", true)
      ).json();
      assert.equal(d.channels.publishedProducts, 33);
      assert(
        d.channels.models.every((p) =>
          p.variants.every((v) => v.metaIssues.length > 0),
        ),
      );
    },
  );
  await check(
    "imagens de anúncios usam JPEG quadrado e recusam arquivos ocultos ou antigos",
    async () => {
      const current = await (
        await req("/api/admin/products", null, "GET", true)
      ).json();
      const original = current.products.find((product) => product.id === p.id);
      const save = await req(
        "/api/admin/products",
        { ...original, images: [uploadedImage] },
        "PUT",
        true,
      );
      assert.equal(save.status, 200);
      const fingerprint = createHash("sha256")
        .update(uploadedImage)
        .digest("hex")
        .slice(0, 12);
      const imagePath = `/feeds/images/${p.id}-0-${fingerprint}.jpg`;
      const image = await req(imagePath);
      assert.equal(image.status, 200);
      assert.equal(image.headers.get("content-type"), "image/jpeg");
      const metadata = await sharp(
        Buffer.from(await image.arrayBuffer()),
      ).metadata();
      assert.equal(metadata.width, 1200);
      assert.equal(metadata.height, 1200);
      assert.equal(
        (await req(`/feeds/images/${p.id}-0-000000000000.jpg`)).status,
        404,
      );
      const saved = (await save.json()).product;
      assert.equal(
        (
          await req(
            "/api/admin/products",
            { ...saved, published: false },
            "PUT",
            true,
          )
        ).status,
        200,
      );
      assert.equal((await req(imagePath)).status, 404);
      const latest = await (
        await req("/api/admin/products", null, "GET", true)
      ).json();
      const restored = await req(
        "/api/admin/products",
        {
          ...latest.products.find((product) => product.id === p.id),
          images: original.images,
          published: original.published,
        },
        "PUT",
        true,
      );
      assert.equal(restored.status, 200);
      p.revision = (await restored.json()).product.revision;
    },
  );
  await check(
    "link da variante mantém preço, disponibilidade e fotografia corretos",
    async () => {
      const original = (
        await (await req("/api/admin/products", null, "GET", true)).json()
      ).products.find((product) => product.id === p.id);
      const other = `${p.id}-qa-second`;
      const pictures = [
        uploadedImage,
        "/assets/ensaio/grau-retrato-1122.webp",
        "/assets/ensaio/sol-retrato-1122.webp",
      ];
      const options = [
        {
          ...original.variants[0],
          id: original.variants[0].id,
          sku: `${p.id}-qa-1`,
          gtin: "4006381333931",
          mpn: "QA-1",
          color: "Preto",
          label: "Preto",
          image: pictures[0],
          lensWidth: 50,
          bridge: 18,
          temple: 140,
          priceCents: 70000,
          stock: 3,
        },
        {
          ...original.variants[0],
          id: other,
          sku: `${p.id}-qa-2`,
          gtin: "",
          mpn: "QA-2",
          color: "Havana",
          label: "Havana",
          image: pictures[1],
          lensWidth: 52,
          bridge: 18,
          temple: 140,
          priceCents: 90000,
          stock: 0,
        },
      ];
      const save = await req(
        "/api/admin/products",
        {
          ...original,
          images: pictures,
          variants: options,
          material: "Acetato",
          verified: true,
          priceConfirmed: true,
        },
        "PUT",
        true,
      );
      assert.equal(save.status, 200);
      const html = await (
        await req(`/produtos/${p.category}/${p.slug}?variant=${other}`)
      ).text();
      const json = JSON.parse(
        html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1],
      );
      assert.equal(json.offers.price, "900.00");
      assert.equal(json.offers.availability, "https://schema.org/OutOfStock");
      assert.equal(new URL(json.offers.url).searchParams.get("variant"), other);
      assert(html.includes(`value="${other}" selected`));
      const fingerprint = createHash("sha256")
        .update(pictures[1])
        .digest("hex")
        .slice(0, 12);
      assert(json.image[0].endsWith(`${p.id}-1-${fingerprint}.jpg`));
      const image = await req(`/feeds/images/${p.id}-1-${fingerprint}.jpg`);
      assert.equal(image.status, 200);
      const saved = (await save.json()).product;
      const restore = await req(
        "/api/admin/products",
        { ...original, revision: saved.revision },
        "PUT",
        true,
      );
      assert.equal(restore.status, 200);
      p.revision = (await restore.json()).product.revision;
    },
  );
  await check(
    "dashboard privado e alterações sem sessão bloqueadas",
    async () => {
      for (const path of ["/api/admin/dashboard", "/api/admin/lenses"]) {
        assert.equal((await req(path)).status, 401);
      }
      for (const path of [
        "/api/admin/inventory",
        "/api/admin/lenses",
        "/api/admin/products",
        `/api/admin/orders/${order.id}`,
      ]) {
        assert.equal((await req(path, {}, "PATCH")).status, 401);
      }
      const r = await req("/api/admin/dashboard", null, "GET", true);
      assert.equal(r.status, 200);
      assert.equal(r.headers.get("cache-control"), "no-store");
      const d = await r.json();
      assert.equal(d.products.length, 33);
      assert.equal(d.orders.length, 1);
      assert.equal(d.config.database, "SQLite local");
      assert.equal(d.config.paymentsEnabled, false);
      assert(d.activity.some((a) => a.type === "admin_login"));
      assert.equal("token" in d.orders[0], false);
    },
  );
  await check(
    "etapas e notas internas protegidas, com revisão de atendimento",
    async () => {
      const { orders } = await (
        await req("/api/admin/orders", null, "GET", true)
      ).json();
      const change = {
        revision: orders[0].revision,
        serviceStatus: "contacted",
        note: "Nota interna exclusiva da equipe.",
      };
      const response = await req(
        `/api/admin/orders/${order.id}`,
        change,
        "PATCH",
        true,
      );
      assert.equal(response.status, 200);
      const changed = (await response.json()).order;
      assert.equal(changed.serviceStatus, "contacted");
      assert.equal(changed.note, change.note);
      assert.equal(
        (await req(`/api/admin/orders/${order.id}`, change, "PATCH", true))
          .status,
        400,
      );
      const customer = (
        await (await req(`/api/orders/${order.id}`, null, "GET", true)).json()
      ).order;
      assert.equal("note" in customer, false);
      assert.equal("serviceStatus" in customer, false);
    },
  );
  await check(
    "ajuste de estoque e preço não aceita revisão antiga",
    async () => {
      const body = {
        productId: p.id,
        variantId: p.variants[0].id,
        revision: p.revision,
        stock: 7,
        priceCents: 123450,
        reason: "Conferência de teste isolado",
      };
      const r = await req("/api/admin/inventory", body, "PATCH", true);
      assert.equal(r.status, 200);
      const changed = (await r.json()).product;
      assert.equal(changed.variants[0].stock, 7);
      assert.equal(changed.variants[0].priceCents, 123450);
      assert.equal(
        (await req("/api/admin/inventory", body, "PATCH", true)).status,
        400,
      );
      const dashboard = await (
        await req("/api/admin/dashboard", null, "GET", true)
      ).json();
      assert(
        dashboard.activity.some(
          (a) =>
            a.type === "inventory_updated" && a.body.reason === body.reason,
        ),
      );
    },
  );
  await check("exibição em lote é atômica e pode ser restaurada", async () => {
    const { products } = await (
      await req("/api/admin/products", null, "GET", true)
    ).json();
    const chosen = products
      .slice(0, 2)
      .map((p) => ({ id: p.id, revision: p.revision }));
    const invalid = { ...chosen[1], revision: chosen[1].revision + 10 };
    assert.equal(
      (
        await req(
          "/api/admin/products",
          { products: [chosen[0], invalid], published: false },
          "PATCH",
          true,
        )
      ).status,
      400,
    );
    let publicCatalog = await (await req("/api/catalog")).json();
    assert.equal(publicCatalog.products.length, 33);
    const hidden = await req(
      "/api/admin/products",
      { products: chosen, published: false },
      "PATCH",
      true,
    );
    assert.equal(hidden.status, 200);
    publicCatalog = await (await req("/api/catalog")).json();
    assert.equal(publicCatalog.products.length, 31);
    const current = (await hidden.json()).products.map((p) => ({
      id: p.id,
      revision: p.revision,
    }));
    assert.equal(
      (
        await req(
          "/api/admin/products",
          { products: current, published: true },
          "PATCH",
          true,
        )
      ).status,
      200,
    );
  });
  await check(
    "preço de lentes salvo pelo painel chega ao simulador",
    async () => {
      const before = await (
        await req("/api/admin/lenses", null, "GET", true)
      ).json();
      assert(before.rows.length > 4000);
      const row = before.rows[0];
      const change = {
        revision: before.revision,
        changes: [{ id: row.id, priceCents: row.priceCents + 123 }],
      };
      assert.equal(
        (await req("/api/admin/lenses", change, "PATCH", true)).status,
        200,
      );
      assert.equal(
        (await req("/api/admin/lenses", change, "PATCH", true)).status,
        400,
      );
      const after = await (
        await req("/api/admin/lenses", null, "GET", true)
      ).json();
      assert.equal(after.rows[0].priceCents, row.priceCents + 123);
      const publicResponse = await req("/api/lenses");
      assert.equal(publicResponse.headers.get("cache-control"), "no-store");
      const lenses = await publicResponse.json();
      const match = lenses[row.brand][row.category][row.line][row.option].find(
        (c) =>
          (c.m || "Não informado") === row.material &&
          (c.i || "") === row.index &&
          c.t === row.treatment,
      );
      assert.equal(Math.round(match.p * 100), row.priceCents + 123);
    },
  );
  await check(
    "promoção de produto aparece na loja e usa o mesmo valor no orçamento",
    async () => {
      const { products } = await (
        await req("/api/admin/products", null, "GET", true)
      ).json();
      let product = products.find((row) => row.id === p.id);
      const invalid = structuredClone(product);
      invalid.variants[0].promotionPriceCents = invalid.variants[0].priceCents;
      assert.equal(
        (await req("/api/admin/products", invalid, "PUT", true)).status,
        400,
      );
      product.variants[0].promotionPriceCents = 99900;
      const saved = await req("/api/admin/products", product, "PUT", true);
      assert.equal(saved.status, 200);
      product = (await saved.json()).product;
      const html = await (
        await req(`/produtos/${product.category}/${product.slug}`)
      ).text();
      assert(html.includes("<del>"));
      assert(html.includes("999,00"));
      assert(
        (await (await req(`/produtos/${product.category}`)).text()).includes(
          "<del>",
        ),
      );
      const quoted = await req(
        "/api/orders",
        { ...body, idempotencyKey: randomUUID() },
        "POST",
        true,
      );
      assert.equal(quoted.status, 201);
      const quoteId = (await quoted.json()).order.id;
      const quote = (
        await (await req(`/api/orders/${quoteId}`, null, "GET", true)).json()
      ).order;
      assert.equal(quote.items[0].priceCents, 99900);
      assert.equal(quote.totalCents, 199800);
      product.variants[0].promotionPriceCents = null;
      assert.equal(
        (await req("/api/admin/products", product, "PUT", true)).status,
        200,
      );
      assert.equal(
        (await (await req(`/api/orders/${quote.id}`, null, "GET", true)).json())
          .order.totalCents,
        199800,
      );
    },
  );
  await check(
    "ativação e promoção de marcas de lentes são protegidas e chegam ao simulador",
    async () => {
      const before = await (
        await req("/api/admin/lenses", null, "GET", true)
      ).json();
      const rows = before.rows.filter((r) => r.brand === "ZEISS");
      assert(rows.length > 1000);
      const bulk = {
        revision: before.revision,
        expectedCount: rows.length,
        filter: { brand: "ZEISS" },
        action: { type: "promotion", percent: 10 },
      };
      assert.equal((await req("/api/admin/lenses", bulk, "POST")).status, 401);
      assert.equal(
        (
          await req(
            "/api/admin/lenses",
            bulk,
            "POST",
            true,
            "https://foreign.example",
          )
        ).status,
        400,
      );
      assert.equal(
        (await req("/api/admin/lenses", bulk, "POST", true)).status,
        200,
      );
      assert.equal(
        (await req("/api/admin/lenses", bulk, "POST", true)).status,
        400,
      );
      let current = await (
        await req("/api/admin/lenses", null, "GET", true)
      ).json();
      assert(
        current.rows
          .filter((r) => r.brand === "ZEISS")
          .every(
            (r) => r.promotionPriceCents === Math.round(r.priceCents * 0.9),
          ),
      );
      let publicData = await (await req("/api/lenses")).json();
      const row = rows[0];
      const config =
        publicData[row.brand][row.category][row.line][row.option][0];
      assert.equal(config.regularPrice, row.priceCents / 100);
      assert.equal(config.p, Math.round(row.priceCents * 0.9) / 100);
      assert.equal(
        (
          await req(
            "/api/admin/lenses",
            {
              ...bulk,
              revision: current.revision,
              action: { type: "visibility", enabled: false },
            },
            "POST",
            true,
          )
        ).status,
        200,
      );
      publicData = await (await req("/api/lenses")).json();
      assert.equal(publicData.ZEISS, undefined);
      assert(publicData.HOYA);
      current = await (
        await req("/api/admin/lenses", null, "GET", true)
      ).json();
      assert.equal(current.rows.length, before.rows.length);
      assert.equal(
        (
          await req(
            "/api/admin/lenses",
            {
              ...bulk,
              revision: current.revision,
              action: { type: "visibility", enabled: true },
            },
            "POST",
            true,
          )
        ).status,
        200,
      );
      current = await (
        await req("/api/admin/lenses", null, "GET", true)
      ).json();
      assert.equal(
        (
          await req(
            "/api/admin/lenses",
            {
              ...bulk,
              revision: current.revision,
              action: { type: "promotion", percent: null },
            },
            "POST",
            true,
          )
        ).status,
        200,
      );
      assert((await (await req("/api/lenses")).json()).ZEISS);
    },
  );
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
