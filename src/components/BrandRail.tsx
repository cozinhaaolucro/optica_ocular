"use client";

import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";

export default function BrandRail({ children }: { children: ReactNode }) {
  const rail = useRef<HTMLUListElement>(null);
  const speed = useRef(34);
  const paused = useRef(false);

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let frame = 0;
    let previous = 0;
    let position = element.scrollLeft;
    let velocity = 34;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(element);
    const animate = (now: number) => {
      const elapsed = previous ? Math.min(now - previous, 40) : 0;
      previous = now;
      if (visible && !document.hidden && !motion.matches && !paused.current) {
        const first = element.firstElementChild as HTMLElement | null;
        const repeated = element.querySelector<HTMLElement>("[data-repeat]");
        const cycle =
          first && repeated ? repeated.offsetLeft - first.offsetLeft : 0;
        if (cycle > 0 && element.scrollWidth > element.clientWidth) {
          // Keep subpixel progress separately: native scrollLeft can round each frame.
          if (Math.abs(element.scrollLeft - position) > 2)
            position = element.scrollLeft;
          velocity +=
            (speed.current - velocity) * (1 - Math.exp(-elapsed / 180));
          position =
            (((position + (velocity * elapsed) / 1000) % cycle) + cycle) %
            cycle;
          element.scrollLeft = position;
        }
      } else {
        position = element.scrollLeft;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  function move(event: PointerEvent<HTMLUListElement>) {
    if (event.pointerType !== "mouse") return;
    if (rail.current?.contains(document.activeElement)) return;
    paused.current = false;
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = Math.max(
      0,
      Math.min(1, (event.clientX - bounds.left) / bounds.width),
    );
    speed.current =
      position < 0.3
        ? -90 * (1 - position / 0.3)
        : position > 0.7
          ? 34 + (90 * (position - 0.7)) / 0.3
          : 34;
  }

  return (
    <ul
      ref={rail}
      className="store-brand-logos"
      aria-label="Marcas de óculos"
      tabIndex={0}
      onPointerEnter={move}
      onPointerMove={move}
      onPointerLeave={() => {
        speed.current = 34;
      }}
      onPointerDown={() => {
        paused.current = true;
      }}
      onFocusCapture={() => {
        paused.current = true;
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          paused.current = false;
      }}
      onKeyDown={() => {
        paused.current = true;
      }}
    >
      {children}
    </ul>
  );
}
