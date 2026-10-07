import Image from "next/image";
import Link from "next/link";
export const metadata = {
  title: "Nossa história",
  alternates: { canonical: "/sobre" },
};
export default function Page() {
  return (
    <main id="conteudo" className="store-page">
      <div className="store-page-heading">
        <p className="eyebrow">Desde 1990, em Curitiba</p>
        <h1>
          Nossa <em>história.</em>
        </h1>
      </div>
      <div className="store-about-teaser">
        <div className="store-about-photo">
          <Image
            src="/assets/ensaio/olhares-geracoes-1536.webp"
            alt="Ensaio editorial com diferentes gerações usando óculos"
            fill
            sizes="(max-width:820px) 100vw,50vw"
            loading="eager"
          />
        </div>
        <div>
          <h2>
            A experiência
            <br />
            de quem sempre
            <br />
            <em>olhou de perto.</em>
          </h2>
          <p>
            Em 1990, Laércio deu início à Óptica Ocular, no bairro Portão, em
            Curitiba. Sua experiência como técnico de laboratório estava na
            origem de um cuidado que ia além da armação: entender o que fazia
            diferença para cada pessoa.
          </p>
          <p>
            Com o tempo, a história ganhou um novo endereço na Rua Bispo Dom
            José. A atenção à escolha e o vínculo com os clientes continuam
            fazendo parte do nosso jeito de trabalhar.
          </p>
          <Link href="/visite" className="text-link">
            Venha conhecer a Ocular
          </Link>
        </div>
      </div>
    </main>
  );
}
