import Link from "next/link";
import { whatsapp } from "@/lib/product";
export const metadata = {
  title: "Dúvidas frequentes",
  alternates: { canonical: "/duvidas" },
};
const questions = [
  [
    "Como escolher meus óculos?",
    "Explore as coleções e adicione modelos à sua seleção. Na loja, a equipe ajuda a avaliar estilo, medidas e encaixe.",
  ],
  [
    "O preço da armação inclui as lentes?",
    "As lentes de grau são orçadas à parte, de acordo com sua receita, material e tratamentos escolhidos.",
  ],
  [
    "Posso pagar pelo site?",
    "O site recebe solicitações de orçamento, sem cobrança. A compra e o pagamento são combinados diretamente com a loja.",
  ],
  [
    "Como funciona a retirada?",
    "Depois da confirmação do atendimento, combine a retirada na Rua Bispo Dom José, 2655, em Curitiba. A equipe informa o prazo antes de concluir o pedido.",
  ],
  [
    "O que levar para escolher lentes de grau?",
    "Traga sua receita oftalmológica e, se tiver, os óculos que usa hoje. A equipe avalia armação, medidas e opções para sua rotina.",
  ],
  [
    "Posso trocar as lentes e manter a armação?",
    "É necessário avaliar o estado e a compatibilidade da armação. Traga seus óculos à loja para conversar sobre as possibilidades.",
  ],
  [
    "Preciso agendar uma visita?",
    "Você pode visitar durante o atendimento. Se preferir combinar sua visita antes, converse com a equipe pelo WhatsApp.",
  ],
];
export default function Page() {
  return (
    <main id="conteudo" className="store-page store-prose">
      <div className="store-page-heading">
        <h1>
          Dúvidas <em>frequentes.</em>
        </h1>
      </div>
      {questions.map(([q, a]) => (
        <details key={q} className="store-detail-info">
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}
      <p>
        <Link href="/entrega">Entrega e retirada</Link>
      </p>
      <a
        href={whatsapp("Olá! Tenho uma dúvida sobre a Óptica Ocular.")}
        className="button"
        target="_blank"
        rel="noopener noreferrer"
      >
        Fale com a equipe
      </a>
    </main>
  );
}
