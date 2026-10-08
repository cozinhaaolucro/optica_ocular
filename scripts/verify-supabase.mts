import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { query, transaction, closePersistence } from "../src/lib/persistence";
import { getProducts, saveProduct, getProduct } from "../src/lib/catalog";
import { createOrder, updateService, publicOrder } from "../src/lib/orders";
import { updateInventory } from "../src/lib/admin";
import {
  getLenses,
  getLensData,
  saveLensPrices,
  updateLensGroup,
} from "../src/lib/lenses";
import { saveMedia, mediaBucket, supabaseUrl } from "../src/lib/media";

const rollback = new Error("verification-rollback");
let imageName: string | undefined;
try {
  if (!process.env.DATABASE_URL) throw new Error("missing-configuration");
  const before = (
    await query<{ n: string }>("SELECT COUNT(*) AS n FROM products")
  )[0].n;
  try {
    await transaction(async () => {
      const original = (await getProducts(true))[0];
      const id = `verify-${randomUUID()}`;
      const product = await saveProduct({
        ...original,
        id,
        slug: id,
        revision: 0,
        name: "Verificacao isolada",
        published: false,
        verified: false,
        variants: [
          { ...original.variants[0], id: `${id}-0`, sku: id, stock: 2 },
        ],
      });
      const adjusted = await updateInventory({
        productId: id,
        variantId: product.variants[0].id,
        revision: product.revision,
        stock: 5,
        priceCents: 49990,
        promotionPriceCents: 39990,
        reason: "Verificacao em transacao revertida",
      });
      assert.equal((await getProduct(id))!.variants[0].stock, 5);
      await saveProduct({ ...adjusted, published: true });
      const { order, accessToken } = await createOrder({
        items: [
          { productId: id, variantId: adjusted.variants[0].id, quantity: 1 },
        ],
        customer: {
          name: "Verificacao isolada",
          email: "verify@example.com",
          phone: "41999990000",
        },
        privacyAccepted: true,
        idempotencyKey: randomUUID(),
      });
      assert(accessToken);
      assert.equal(order.totalCents, 39990);
      const updated = await updateService(order.id, {
        revision: order.revision,
        serviceStatus: "contacted",
        note: "Nota privada de verificacao",
      });
      assert.equal("note" in publicOrder(updated), false);
      const lenses = await getLenses();
      await saveLensPrices({
        revision: lenses.revision,
        changes: [
          {
            id: lenses.rows[0].id,
            priceCents: 123456,
            promotionPriceCents: 99900,
            enabled: false,
          },
        ],
      });
      assert.equal((await getLenses()).rows[0].priceCents, 123456);
      let current = await getLenses();
      assert.equal(current.rows[0].promotionPriceCents, 99900);
      assert.equal(current.rows[0].enabled, false);
      const brand = current.rows[0].brand;
      const count = current.rows.filter((r) => r.brand === brand).length;
      await updateLensGroup({
        revision: current.revision,
        expectedCount: count,
        filter: { brand },
        action: { type: "visibility", enabled: false },
      });
      assert.equal((await getLensData())[brand], undefined);
      current = await getLenses();
      await updateLensGroup({
        revision: current.revision,
        expectedCount: count,
        filter: { brand },
        action: { type: "visibility", enabled: true },
      });
      const row = current.rows[0];
      const config = (await getLensData())[brand][row.category][row.line][
        row.option
      ][0];
      assert.equal(config.p, 999);
      assert.equal(config.regularPrice, 1234.56);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  assert.equal(
    (await query<{ n: string }>("SELECT COUNT(*) AS n FROM products"))[0].n,
    before,
  );
  console.log(
    "OK Supabase: cadastro, estoque, atendimento, promocoes e ativacao de lentes; transacao revertida.",
  );
  imageName = `${randomUUID()}.webp`;
  const bytes = await sharp({
    create: { width: 800, height: 600, channels: 3, background: "#f6f5f2" },
  })
    .webp()
    .toBuffer();
  await saveMedia(imageName, bytes);
  const response = await fetch(
    `${supabaseUrl()}/storage/v1/object/public/${mediaBucket}/${imageName}`,
  );
  assert.equal(response.status, 200);
  assert.equal(
    (await sharp(Buffer.from(await response.arrayBuffer())).metadata()).width,
    800,
  );
  console.log("OK Supabase Storage: envio e leitura publica de fotografia.");
} catch {
  console.error(
    "A verificacao do Supabase falhou. Nenhuma credencial foi exibida.",
  );
  process.exitCode = 1;
} finally {
  if (imageName) {
    const client = createClient(
      supabaseUrl(),
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false } },
    );
    const result = await client.storage.from(mediaBucket).remove([imageName]);
    if (result.error) {
      console.error("Nao foi possivel remover a imagem de verificacao.");
      process.exitCode = 1;
    }
  }
  await closePersistence();
}
