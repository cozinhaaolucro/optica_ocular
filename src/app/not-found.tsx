import Link from "next/link";
export default function NotFound() {
  return (
    <main id="conteudo" className="store-page store-empty">
      <p className="eyebrow">404</p>
      <h1>
        Página <em>não encontrada.</em>
      </h1>
      <p>Esta página ou modelo não está disponível.</p>
      <Link href="/oculos" className="button">
        Explorar as coleções
      </Link>
    </main>
  );
}
