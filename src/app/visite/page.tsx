import { whatsapp } from "@/lib/product";
export const metadata = {
  title: "Visite a loja",
  alternates: { canonical: "/visite" },
};
export default function Page() {
  return (
    <main id="conteudo" className="store-page">
      <div className="store-page-heading">
        <h1>
          Visite a <em>Ocular.</em>
        </h1>
        <p>Experimente os modelos na nossa loja em Curitiba.</p>
      </div>
      <div className="store-visit-grid">
        <section>
          <h2>Encontre a Ocular.</h2>
          <address>
            Rua Bispo Dom José, 2655
            <br />
            Seminário · Curitiba, PR
            <br />
            CEP 80440-080
          </address>
          <a
            href="https://www.google.com/maps/dir/?api=1&destination=Rua+Bispo+Dom+Jos%C3%A9+2655+Curitiba+PR"
            className="button"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir rota no Google Maps
          </a>
        </section>
        <section>
          <h2>Quando visitar.</h2>
          <dl className="store-specs">
            <div>
              <dt>Segunda a sexta</dt>
              <dd>9h às 18h30</dd>
            </div>
            <div>
              <dt>Sábado</dt>
              <dd>9h às 13h</dd>
            </div>
            <div>
              <dt>Domingo</dt>
              <dd>Fechado</dd>
            </div>
          </dl>
          <p className="store-muted">
            Em feriados, confirme o atendimento com a equipe.
          </p>
        </section>
        <section>
          <h2>Vamos conversar?</h2>
          <a
            href={whatsapp(
              "Olá! Gostaria de combinar minha visita à Óptica Ocular.",
            )}
            className="button"
            target="_blank"
            rel="noopener noreferrer"
          >
            Conversar pelo WhatsApp
          </a>
          <p>
            <a href="tel:+554130169654">(41) 3016-9654</a>
          </p>
          <p>
            <a href="mailto:optica-ocular@hotmail.com">
              optica-ocular@hotmail.com
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
