"use client";

import { OverlaySlot } from "@/ui/overlays";
import type { DeckAnnotation } from "@/lib/deck";

export function AnnotationsOverlay({ annotations }: { annotations?: DeckAnnotation[] }) {
  if (!annotations || annotations.length === 0) return null;

  return (
    <OverlaySlot slot="bottom-left">
      <div className="flex flex-col gap-2">
        {annotations.map((annotation) => (
          <div
            key={annotation.id ?? `${annotation.lon}-${annotation.lat}-${annotation.text}`}
            className="pointer-events-auto rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md px-4 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.7)] max-w-xs"
          >
            {annotation.title && (
              <p className="text-xs uppercase tracking-[0.2em] text-accent/80">{annotation.title}</p>
            )}
            <p className="text-sm font-medium text-white">{annotation.text}</p>
          </div>
        ))}
      </div>
    </OverlaySlot>
  );
}