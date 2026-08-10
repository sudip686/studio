"use client";

import { OverlaySlot } from "@/ui/overlays";
import type { DeckAnnotation } from "@/lib/deck";

export function AnnotationsOverlay({ annotations }: { annotations?: DeckAnnotation[] }) {
  if (!annotations || annotations.length === 0) return null;

  const annotationsBySlot = annotations.reduce<Record<string, DeckAnnotation[]>>((acc, annotation) => {
    const slot = annotation.slot ?? "bottom-left";
    if (!acc[slot]) {
      acc[slot] = [];
    }
    acc[slot].push(annotation);
    return acc;
  }, {});

  return (
    <>
      {Object.entries(annotationsBySlot).map(([slot, slotAnnotations]) => (
        <OverlaySlot key={slot} slot={slot as NonNullable<DeckAnnotation["slot"]>}>
          <div className="flex flex-col gap-2">
            {slotAnnotations.map((annotation) => (
              <div
                key={annotation.id ?? `${annotation.lon}-${annotation.lat}-${annotation.text}`}
                className="pointer-events-auto max-w-xs rounded-2xl border border-white/10 bg-black/60 px-4 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.7)] backdrop-blur-md"
              >
                {annotation.title && (
                  <p className="text-xs uppercase tracking-[0.2em] text-accent/80">{annotation.title}</p>
                )}
                <p className="text-sm font-medium text-white">{annotation.text}</p>
              </div>
            ))}
          </div>
        </OverlaySlot>
      ))}
    </>
  );
}
