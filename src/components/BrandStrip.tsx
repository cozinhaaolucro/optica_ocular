import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import BrandRail from "./BrandRail";

const eyewear = [
  ["Ray-Ban", "ray-ban"],
  ["Vogue", "vogue"],
  ["Ana Hickmann", "ana-hickmann"],
  ["Persol", "persol"],
  ["Emporio Armani", "emporio-armani"],
  ["Versace", "versace"],
  ["Ralph Lauren", "ralph-lauren"],
  ["Swarovski", "swarovski"],
  ["Police", "police"],
  ["Guess", "guess"],
  ["Colcci", "colcci"],
  ["Aramis", "aramis"],
  ["Davidoff", "davidoff"],
  ["Yalea", "yalea"],
  ["Just Cavalli", "just-cavalli"],
  ["Mormaii", "mormaii"],
  ["Fila", "fila"],
  ["Victor Hugo", "victor-hugo"],
  ["Evoke", "evoke"],
  ["Detroit", "detroit"],
  ["Occhi", "occhi"],
  ["Platini", "platini"],
];

export default function BrandStrip({ products }: { products: Product[] }) {
  return (
    <section className="store-brands" aria-labelledby="brands-title">
      <h2 id="brands-title">Nossas marcas</h2>
      <BrandRail>
        {[false, true].flatMap((repeat) =>
          eyewear.map(([name, file]) => {
            const models = products.filter((p) => p.brand === name);
            const category =
              models.find((p) => p.category === "grau")?.category ||
              models[0]?.category;
            const logo = (
              <Image
                src={`/assets/brands/strip/${file}.webp`}
                alt={repeat ? "" : name}
                fill
                sizes="120px"
                className={
                  file === "ray-ban"
                    ? "is-original-logo is-ray-ban-logo"
                    : undefined
                }
              />
            );
            return (
              <li
                key={`${repeat}-${file}`}
                aria-hidden={repeat || undefined}
                data-repeat={repeat || undefined}
              >
                {category ? (
                  <Link
                    href={`/produtos/${category}?marca=${encodeURIComponent(name)}`}
                    aria-label={`Ver óculos ${name}`}
                    tabIndex={repeat ? -1 : undefined}
                  >
                    {logo}
                  </Link>
                ) : (
                  <span>{logo}</span>
                )}
              </li>
            );
          }),
        )}
      </BrandRail>
    </section>
  );
}
