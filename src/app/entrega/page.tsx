import Link from "next/link";
export const metadata = {
  title: "Entrega e retirada",
  alternates: { canonical: "/entrega" },
};
export default function Page() {
  return (
    <main id="conteudo" className="store-page store-prose">
      <div className="store-page-heading">
        <h1>
          Entrega e <em>retirada.</em>
        </h1>
      </div>
      <h2>Retirada na loja</h2>
      <p>
        Retire seus óculos na Rua Bispo Dom José, 2655, Seminário, Curitiba.
        Combine o prazo com a loja ao concluir o orçamento. A solicitação pelo
        site não reserva o produto.
      </p>
      <h2>Prazo e acompanhamento</h2>
      <p>
        Você recebe um número de solicitação e pode acompanhar o registro neste
        navegador. Para óculos com lentes, o prazo depende da receita e da
        produção; a previsão é informada no orçamento.
      </p>
      <h2>Envio para outros endereços</h2>
      <p>
        O envio ainda não está disponível para contratação neste site. Consulte
        a equipe para avaliar as possibilidades. Não é cobrado frete ao enviar
        uma solicitação.
      </p>
      <Link href="/visite" className="button">
        Ver a localização
      </Link>
    </main>
  );
}
