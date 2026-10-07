import { whatsapp } from "@/lib/product";
export const metadata = {
  title: "Trocas e garantia",
  alternates: { canonical: "/trocas" },
};
export default function Page() {
  return (
    <main id="conteudo" className="store-page store-prose">
      <div className="store-page-heading">
        <h1>
          Trocas e <em>garantia.</em>
        </h1>
      </div>
      <h2>Atendimento após a compra</h2>
      <p>
        Se precisar de ajuste, avaliação de uma troca ou orientação sobre
        garantia, fale com a equipe. Informe o modelo, a data da compra e o
        documento do pedido para que possamos localizar seu atendimento.
      </p>
      <h2>Antes de concluir o pedido</h2>
      <p>
        Consulte as condições de troca e garantia durante o orçamento, antes de
        concluir a compra. Para lentes feitas conforme sua receita, converse
        também sobre produção e adaptação.
      </p>
      <h2>Lentes e adaptação</h2>
      <p>
        Converse com a equipe sobre sua receita, a armação e as condições da
        lente escolhida. Prazos e condições dependem do produto e são
        confirmados no atendimento.
      </p>
      <a
        href={whatsapp(
          "Olá! Gostaria de atendimento sobre ajuste, troca ou garantia de um produto da Óptica Ocular.",
        )}
        className="button"
        target="_blank"
        rel="noopener noreferrer"
      >
        Conversar com a equipe
      </a>
    </main>
  );
}
