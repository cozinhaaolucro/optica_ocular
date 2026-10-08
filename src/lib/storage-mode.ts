import "server-only";

export function usesPostgres() {
  return !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

export function isCatalogPreview() {
  return (
    process.env.OCULAR_CATALOG_PREVIEW === "true" ||
    (process.env.VERCEL === "1" && !usesPostgres())
  );
}

export class PersistenceUnavailableError extends Error {
  constructor() {
    super(
      "Serviço temporariamente indisponível. Fale com a loja para continuar.",
    );
  }
}
