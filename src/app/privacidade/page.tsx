import Link from "next/link";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Privacidade",
  alternates: { canonical: "/privacidade" },
};
export default function Page() {
  return (
    <main id="conteudo" className="store-page store-prose">
      <div className="store-page-heading">
        <h1>
          Sua <em>privacidade.</em>
        </h1>
        <p>Como usamos seus dados no site e no atendimento.</p>
      </div>
      <section>
        <h2>Carrinho e navegação</h2>
        <p>
          O navegador guarda os identificadores e as quantidades da sua seleção
          no armazenamento local, para manter o carrinho entre visitas. Você
          pode remover os itens ou limpar o carrinho. O preço e a
          disponibilidade são consultados no catálogo.
        </p>
      </section>
      <section>
        <h2>Solicitações de orçamento</h2>
        <p>
          Ao enviar uma solicitação, seu nome, e-mail, telefone e os itens
          escolhidos são registrados para que a equipe trate o atendimento. Não
          coletamos números de cartão, pagamentos ou receitas médicas neste
          formulário.
        </p>
        <p>
          Um cookie necessário permite consultar a solicitação neste navegador
          por até 14 dias. O acesso administrativo usa um cookie necessário com
          duração máxima de oito horas.
        </p>
      </section>
      <section>
        <h2>Serviços externos</h2>
        <p>
          Links para WhatsApp, Google Maps e Instagram abrem serviços de
          terceiros. Mensagens preparadas só são enviadas por você. Esses
          serviços seguem suas próprias políticas. As fontes e imagens do site
          são servidas pela própria aplicação.
        </p>
      </section>
      <section>
        <h2>Medição técnica</h2>
        <p>
          Quando habilitada pela loja, a medição técnica registra indicadores de
          carregamento e eventos agregados da jornada, sem incluir nome, e-mail,
          telefone, conteúdo do carrinho ou identificador pessoal. Esses eventos
          são mantidos por até 30 dias. Nesta configuração, a medição está{" "}
          {process.env.OCULAR_TELEMETRY_ENABLED === "true"
            ? "ativada"
            : "desativada"}
          .
        </p>
      </section>
      <section>
        <h2>Seus dados e contato</h2>
        <p>
          Para consultar, corrigir ou solicitar a exclusão de dados fornecidos
          no atendimento, contate{" "}
          <a href="mailto:optica-ocular@hotmail.com">
            optica-ocular@hotmail.com
          </a>{" "}
          ou <a href="tel:+554130169654">(41) 3016-9654</a>. A equipe informa o
          procedimento e os registros que precisem ser mantidos para a operação.
        </p>
      </section>
      <p className="store-muted">Atualizado em 7 de outubro de 2026.</p>
      <Link href="/duvidas" className="text-link">
        Mais informações
      </Link>
    </main>
  );
}
