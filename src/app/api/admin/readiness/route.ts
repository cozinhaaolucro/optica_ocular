import { requireAdmin } from "@/lib/auth";
import { getProducts } from "@/lib/catalog";
import { canSell } from "@/lib/product";
import { storeConfig } from "@/lib/config";
import { apiError, privateJson } from "@/lib/http";
import { usesPostgres } from "@/lib/storage-mode";
export async function GET() {
  try {
    await requireAdmin();
    const products = await getProducts(true);
    return privateJson({
      config: await storeConfig(),
      products: products.length,
      verified: products.filter(canSell).length,
      pending: products.filter((p) => !canSell(p)).length,
      payment: "Provedor a definir com o cliente. Nenhuma cobrança ativa.",
      storage: usesPostgres()
        ? "Supabase · PostgreSQL"
        : "SQLite em volume persistente",
      notifications:
        "Solicitações disponíveis no painel; mensagens automáticas não configuradas.",
    });
  } catch (e) {
    return apiError(e, 401);
  }
}
