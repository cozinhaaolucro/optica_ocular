"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="conteudo" className="store-page store-empty">
      <h1>
        Vamos tentar
        <br />
        <em>mais uma vez.</em>
      </h1>
      <p>Não foi possível carregar esta página agora.</p>
      <button className="button" type="button" onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}
