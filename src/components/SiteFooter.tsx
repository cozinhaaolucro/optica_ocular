import Image from "next/image";
import Link from "next/link";
import { whatsapp } from "@/lib/product";
export default function SiteFooter() {
  return (
    <footer className="store-footer">
      <div className="store-footer-top">
        <div>
          <Link href="/" aria-label="Óptica Ocular, início" className="footer-brand">
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
        <div>
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
