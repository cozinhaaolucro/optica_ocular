import Image from "next/image";
import Link from "next/link";
import { getProducts } from "@/lib/catalog";
import HomeProductSection from "@/components/HomeProductSection";
import LensSimulator from "@/components/LensSimulator";
import BrandStrip from "@/components/BrandStrip";
export const dynamic = "force-dynamic";
export const metadata = { alternates: { canonical: "/" } };
export default async function Home() {
  const products = await getProducts();
  return (
    <main id="conteudo">
      <section className="store-hero">
        <div className="store-hero-copy">
          <h1>
            Seu jeito
            <br />
            de ver
            <br />
            <em>o mundo.</em>
          </h1>
          <p>
            Óculos de grau, de sol e lentes.
            <br /> Escolha seus modelos e venha experimentar na loja.
          </p>
          <div className="store-hero-actions">
            <Link href="/oculos" className="button">
              Coleções
            </Link>
            <Link href="/lentes" className="button button-outline">
              Lentes
            </Link>
          </div>
        </div>
        <div className="store-hero-photo">
          <Image
            src="/assets/ensaio/grau-retrato-1122.webp"
            alt="Retrato editorial com óculos de grau"
            fill
            sizes="(max-width: 820px) 100vw, 52vw"
            loading="eager"
            fetchPriority="high"
          />
        </div>
      </section>
      <BrandStrip products={products} />
      <HomeProductSection products={products} />
      <section className="home-collections">
        <Link href="/produtos/grau" className="home-collection">
          <div>
            <div className="circle-wrapper">
              <Image
                src="/assets/grau-isolado.png"
                alt="Coleção de óculos de grau"
                width={220}
                height={220}
              />
            </div>
          </div>
          <span>Óculos de grau</span>
        </Link>
        <Link href="/produtos/sol" className="home-collection">
          <div>
            <div className="circle-wrapper">
              <Image
                src="/assets/solar-isolado.png"
                alt="Coleção de óculos de sol"
                width={220}
                height={220}
              />
            </div>
          </div>
          <span>Óculos de sol</span>
        </Link>
      </section>
      <LensSimulator />
      <section className="store-about-teaser store-section">
        <div className="store-about-photo">
          <Image
            src="/assets/ensaio/olhares-geracoes-1280.webp"
            alt="Ensaio editorial com diferentes gerações usando óculos"
            fill
            sizes="(max-width: 820px) 100vw, 50vw"
          />
        </div>
        <div>
          <p className="eyebrow">Nossa história</p>
          <h2>
            Muitos anos.
            <br />
            <em>Novos olhares.</em>
          </h2>
          <p>
            A Ocular começou em 1990, no bairro Portão. Hoje, atendemos na Rua
            Bispo Dom José, com a mesma atenção à escolha dos óculos e das
            lentes.
          </p>
          <Link href="/sobre" className="text-link">
            Conheça nossa história
          </Link>
        </div>
      </section>
    </main>
  );
}
