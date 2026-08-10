"use client";

import { OverlayProvider } from "./OverlayProvider";
import { OverlaySlotContent } from "./slots";

export function OverlayRoot({
  baseSlots,
  leftOffsetPx,
  rightOffsetPx,
  topOffsetPx,
  bottomOffsetPx,
  children,
}: {
  baseSlots?: OverlaySlotContent;
  leftOffsetPx?: number | string;
  rightOffsetPx?: number | string;
  topOffsetPx?: number | string;
  bottomOffsetPx?: number | string;
  children: React.ReactNode;
}) {
  // Check if we're on a presentation slide for proper overlay positioning
  const pathSegments = typeof window !== 'undefined' ? window.location.pathname.split('/').filter(Boolean) : [];
  const isPresentationSlide = ['lithology', 'assay', 'carbon_model', 'classification'].some(id =>
    pathSegments.includes(id)
  );

  return (
    <OverlayProvider
      baseSlots={baseSlots}
      leftOffsetPx={leftOffsetPx ?? 0}
      rightOffsetPx={rightOffsetPx ?? 0}
      topOffsetPx={topOffsetPx ?? "var(--header-height, 0px)"}
      bottomOffsetPx={bottomOffsetPx}
      dataPresentationMode={isPresentationSlide}
    >
      {children}
    </OverlayProvider>
  );
}
