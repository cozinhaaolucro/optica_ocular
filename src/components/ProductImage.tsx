"use client";
import Image from "next/image";
import { useState } from "react";
export default function ProductImage({
  src,
  alt,
  className = "",
  priority = false,
  view = "frontal",
  sizes = "(max-width: 1000px) 45vw, 30vw",
}: {
  src?: string;
  alt: string;
  className?: string;
  priority?: boolean;
  view?: "frontal" | "lateral" | "detalhe";
  sizes?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const actual =
    src && failed !== src ? src : `/assets/placeholders/${view}.svg`;
  return (
    <div
      className={`product-image-wrapper ${!src || failed === src ? "is-placeholder" : ""} ${className}`}
    >
      <Image
        src={actual}
        alt={
          alt === ""
            ? ""
            : src && failed !== src
              ? alt
              : `Ilustração de óculos, vista ${view}`
        }
        fill
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        unoptimized={actual.endsWith(".svg")}
        onError={() => {
          if (src) setFailed(src);
        }}
        className="product-image-img"
      />
    </div>
  );
}
