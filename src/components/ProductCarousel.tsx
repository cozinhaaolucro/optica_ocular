"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";
const subscribe = (cb: () => void) => {
  const m = window.matchMedia("(prefers-reduced-motion: reduce)");
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
export default function ProductCarousel({
  products,
  title = "Uma seleção para você",
  autoPlay = false,
}: {
  products: Product[];
  title?: string;
  autoPlay?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
  useEffect(() => {
    if (!playing || paused || reduced || products.length < 2) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % products.length),
      6000,
    );
    return () => clearInterval(timer);
  }, [playing, paused, reduced, products.length]);
  if (!products.length) return null;
  const current = index % products.length;
  return (
    <section
      className="store-carousel"
      aria-label={title}
      aria-roledescription="carrossel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
    >
      <div className="store-section-top">
        <h2>{title}</h2>
        <div className="store-carousel-controls">
          <button
            type="button"
            aria-label="Produto anterior"
            onClick={() =>
              setIndex((current - 1 + products.length) % products.length)
            }
          >
            ←
          </button>
          <span aria-live={playing ? "off" : "polite"}>
            {current + 1} / {products.length}
          </span>
          <button
            type="button"
            aria-label="Próximo produto"
            onClick={() => setIndex((current + 1) % products.length)}
          >
            →
          </button>
          {autoPlay && !reduced && (
            <button
              type="button"
              aria-pressed={playing}
              onClick={() => setPlaying(!playing)}
            >
              {playing ? "Pausar" : "Reproduzir"}
            </button>
          )}
        </div>
      </div>
      <div className="store-carousel-window">
        <div
          className="store-carousel-track"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {products.map((p, i) => (
            <div
              className="store-carousel-slide"
              key={p.id}
              aria-hidden={i !== current}
              inert={i !== current}
              role="group"
              aria-label={`${i + 1} de ${products.length}`}
            >
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
