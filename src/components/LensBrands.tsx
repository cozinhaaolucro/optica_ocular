import Image from "next/image";

const brands = [
  ["HOYA", "hoya-clean.png"],
  ["Rodenstock", "rodenstock.png"],
  ["ZEISS", "zeiss-clean.png"],
  ["Varilux", "varilux-clean.png"],
  ["Crizal", "crizal-clean.png"],
  ["Transitions", "transitions-clean.png"],
];

export default function LensBrands() {
  return (
    <ul
      className="store-lens-brands"
      aria-label="Marcas e tecnologias de lentes"
    >
      {brands.map(([name, file]) => (
        <li key={file}>
          <Image
            src={`/assets/brands/${file}`}
            alt={name}
            fill
            sizes="110px"
            className={name === "ZEISS" ? "is-light-logo" : undefined}
          />
        </li>
      ))}
    </ul>
  );
}
