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
  return (
    <OverlayProvider
      baseSlots={baseSlots}
      leftOffsetPx={leftOffsetPx ?? 0}
      rightOffsetPx={rightOffsetPx ?? 0}
      topOffsetPx={topOffsetPx ?? "var(--header-height, 0px)"}
      bottomOffsetPx={bottomOffsetPx}
    >
      {children}
    </OverlayProvider>
  );
}
