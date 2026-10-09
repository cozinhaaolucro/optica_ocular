export default function Loading() {
  return (
    <main id="conteudo" className="store-page" aria-busy="true">
      <p role="status">Carregando…</p>
      <div className="store-loading-block" />
    </main>
  );
}
