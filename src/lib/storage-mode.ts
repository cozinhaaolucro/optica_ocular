import "server-only";

export function isCatalogPreview() {
  return (
    process.env.VERCEL === "1" || process.env.OCULAR_CATALOG_PREVIEW === "true"
  );
}

export class PersistenceUnavailableError extends Error {
  constructor() {
    super(
      "Serviço temporariamente indisponível. Fale com a loja para continuar.",
    );
  }
}
