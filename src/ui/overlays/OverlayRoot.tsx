"use client";

import { OverlayProvider } from "./OverlayProvider";
import { OverlaySlotContent } from "./slots";

export function OverlayRoot({
  baseSlots,
  children,
}: {
  baseSlots?: OverlaySlotContent;
  children: React.ReactNode;
}) {
  return (
    <OverlayProvider
      baseSlots={baseSlots}
      leftOffsetPx="var(--chapter-sidebar-width, 0px)"
      rightOffsetPx="var(--chapter-trigger-width, 0px)"
      topOffsetPx="var(--header-height, 0px)"
    >
      {children}
    </OverlayProvider>
  );
}