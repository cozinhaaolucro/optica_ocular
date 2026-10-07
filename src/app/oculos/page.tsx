import Image from "next/image";
import Link from "next/link";
import { categories } from "@/lib/product";
export const metadata = {
  title: "Nossas coleções",
  alternates: { canonical: "/oculos" },
};
export default function Page() {
  return (
    <main id="conteudo" className="store-page">
      <div className="store-page-heading">
        <h1>
          Nossas <em>coleções.</em>
        </h1>
        <p>Armações de grau e óculos de sol.</p>
      </div>
      <div className="store-collections">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/produtos/${c.id}`}
            className="store-collection"
          >
            <div>
              <Image
                src={c.image}
                alt={`${c.name}, fotografia editorial`}
                fill
                sizes="(max-width:820px) 100vw,50vw"
              />
            </div>
            <span>{c.name}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
