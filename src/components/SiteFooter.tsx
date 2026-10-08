import Image from "next/image";
import Link from "next/link";
import { whatsapp } from "@/lib/product";
export default function SiteFooter() {
  const location = "Óptica Ocular, Rua Bispo Dom José, 2655, Curitiba - PR";
  return (
    <footer className="store-footer">
      <div className="store-footer-top">
        <div className="store-footer-brand">
          <Link
            href="/"
            aria-label="Óptica Ocular, início"
            className="footer-brand"
          >
            <Image
              src="/assets/logo-white.png"
              width={100}
              height={100}
              alt="Óptica Ocular"
            />
            <Image
              src="/assets/brand-text-footer.svg"
              width={200}
              height={26}
              alt="Óptica Ocular"
            />
          </Link>
        </div>
        <div>
          <p className="eyebrow">Encontre a Ocular</p>
          <address>
            Rua Bispo Dom José, 2655
            <br />
            Seminário · Curitiba, PR
          </address>
          <Link href="/visite" className="text-link">
            Horários e localização
          </Link>
        </div>
        <div className="store-footer-contact">
          <p className="eyebrow">Conte com a gente</p>
          <a
            href={whatsapp(
              "Olá! Vim pelo site da Óptica Ocular e gostaria de conversar com a equipe.",
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp · (41) 99750-2091
          </a>
          <a href="tel:+554130169654">Telefone · (41) 3016-9654</a>
          <a href="mailto:optica-ocular@hotmail.com">
            optica-ocular@hotmail.com
          </a>
        </div>
        <div className="store-footer-map">
          <p className="eyebrow">A loja no mapa</p>
          <iframe
            title="Localização da Óptica Ocular no Google Maps"
            src={`https://www.google.com/maps?q=${encodeURIComponent(location)}&z=16&hl=pt-BR&output=embed`}
            width="400"
            height="240"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link store-footer-route"
          >
            Como chegar
          </a>
        </div>
      </div>
      <div
        className="store-footer-links"
        role="navigation"
        aria-label="Informações da loja"
      >
        <Link href="/duvidas">Dúvidas frequentes</Link>
        <Link href="/entrega">Entrega e retirada</Link>
        <Link href="/trocas">Trocas e garantia</Link>
        <Link href="/privacidade">Privacidade</Link>
        <a
          href="https://www.instagram.com/opticaocularctba/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Instagram
        </a>
        <span>© Óptica Ocular</span>
      </div>
    </footer>
  );
}
