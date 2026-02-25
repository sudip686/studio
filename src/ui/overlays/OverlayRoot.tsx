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
      leftOffsetPx={0}
      rightOffsetPx={0}
      topOffsetPx="var(--header-height, 0px)"
    >
      {children}
    </OverlayProvider>
  );
}