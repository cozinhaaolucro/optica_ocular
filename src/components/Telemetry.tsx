"use client";
import { useEffect } from "react";
export default function Telemetry({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const send = (data: Record<string, unknown>) => {
      if (!active) return;
      try {
        navigator.sendBeacon(
          "/api/telemetry",
          new Blob([JSON.stringify(data)], { type: "application/json" }),
        );
      } catch {
        // Optional metrics must never interrupt the customer journey.
      }
    };
    import("web-vitals")
      .then(({ onLCP, onCLS, onINP }) => {
        if (!active) return;
        const report = (m: { name: string; value: number }) =>
          send({ event: "metric", name: m.name, value: m.value });
        onLCP(report);
        onCLS(report);
        onINP(report);
      })
      .catch(() => {});
    const event = (e: Event) => send((e as CustomEvent).detail);
    window.addEventListener("ocular-event", event);
    return () => {
      active = false;
      window.removeEventListener("ocular-event", event);
    };
  }, [enabled]);
  return null;
}
