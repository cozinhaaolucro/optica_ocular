import "server-only";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { getProducts } from "../src/lib/catalog";
import { referenceProducts } from "../src/lib/catalog-seed";
import { setPublished } from "../src/lib/admin";
import { closePersistence, transaction } from "../src/lib/persistence";
import { usesPostgres } from "../src/lib/storage-mode";

try {
  assert(usesPostgres(), "A ativação exige o banco PostgreSQL da loja.");
  const before = await getProducts(true);
  const filmed = before.filter((product) =>
    product.tags.includes("videos-20261008"),
  );
  assert.equal(
    filmed.length,
    50,
    "O lote precisa conter exatamente 50 modelos.",
  );
  assert(
    filmed.every(
      (product) =>
        product.images.length > 0 &&
        product.images.every((image) => !image.includes("/placeholders/")),
    ),
    "Todas as fichas precisam de fotos reais de catálogo.",
  );
  const references = new Map(
    referenceProducts().map((product) => [product.id, product]),
  );
  const examples = before.filter((product) => {
    const reference = references.get(product.id);
    return (
      product.published &&
      reference &&
      product.name === reference.name &&
      !product.verified &&
      !product.priceConfirmed &&
      product.images.every((image) => image.includes("/placeholders/"))
    );
  });
  const activate = filmed.filter((product) => !product.published);
  const summary = {
    activate: activate.length,
    alreadyActive: filmed.length - activate.length,
    hideExamples: examples.length,
    totalRecords: before.length,
  };
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify(summary));
  } else {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await mkdir("backups", { recursive: true });
    const backup = `backups/catalog-before-activation-${timestamp}.json`;
    await writeFile(backup, JSON.stringify(before, null, 2), { flag: "wx" });
    const changed = new Set(
      [...activate, ...examples].map((product) => product.id),
    );
    const after = await transaction(async () => {
      if (activate.length)
        await setPublished({
          products: activate.map(({ id, revision }) => ({ id, revision })),
          published: true,
        });
      if (examples.length)
        await setPublished({
          products: examples.map(({ id, revision }) => ({ id, revision })),
          published: false,
        });
      const current = await getProducts(true);
      assert.equal(current.length, before.length);
      for (const original of before) {
        const saved = current.find((product) => product.id === original.id)!;
        assert(saved, "Nenhum cadastro pode desaparecer.");
        if (changed.has(original.id)) {
          assert.deepEqual(
            {
              ...saved,
              published: original.published,
              revision: original.revision,
            },
            original,
            "A ativação só pode alterar visibilidade e revisão.",
          );
        } else
          assert.deepEqual(
            saved,
            original,
            "Cadastro fora do lote foi alterado.",
          );
      }
      assert(
        current
          .filter((product) => product.tags.includes("videos-20261008"))
          .every((product) => product.published),
      );
      assert(
        examples.every(
          (example) =>
            !current.find((product) => product.id === example.id)!.published,
        ),
      );
      return current;
    });
    const result = {
      ...summary,
      publicProducts: after.filter((product) => product.published).length,
      pricesAndStockPreserved: true,
      backup,
    };
    await mkdir("data/final-audit-20261009", { recursive: true });
    await writeFile(
      "data/final-audit-20261009/activation-result.json",
      JSON.stringify(result, null, 2),
    );
    await writeFile(
      "data/final-audit-20261009/catalog-after-activation.json",
      JSON.stringify(after, null, 2),
    );
    console.log(JSON.stringify(result));
  }
} finally {
  await closePersistence();
}
