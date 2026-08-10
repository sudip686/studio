import { OverlaySlotContent, OverlaySlotKey } from "./slots";
import { uiTheme } from "./uiTheme";

type OverlayLayoutProps = OverlaySlotContent & {
  className?: string;
  leftOffsetPx?: number | string;
  rightOffsetPx?: number | string;
  topOffsetPx?: number | string;
  bottomOffsetPx?: number | string;
};

const slotBase = "hud-slot flex flex-col gap-3 max-w-full";

const slotAlignment: Record<OverlaySlotKey, string> = {
  "top-left": "tl",
  "top-center": "tc",
  "top-right": "tr",
  "bottom-left": "bl",
  "bottom-center": "bc",
  "bottom-right": "br",
};

export function OverlayLayout({
  topLeft,
  topCenter,
  topRight,
  bottomLeft,
  bottomCenter,
  bottomRight,
  className,
  leftOffsetPx = 0,
  rightOffsetPx = 0,
  topOffsetPx = 0,
  bottomOffsetPx = 0,
  dataPresentationMode,
}: {
  topLeft?: React.ReactNode;
  topCenter?: React.ReactNode;
  topRight?: React.ReactNode;
  bottomLeft?: React.ReactNode;
  bottomCenter?: React.ReactNode;
  bottomRight?: React.ReactNode;
  className?: string;
  leftOffsetPx?: number | string;
  rightOffsetPx?: number | string;
  topOffsetPx?: number | string;
  bottomOffsetPx?: number | string;
  dataPresentationMode?: boolean;
}) {
  // Adjust overlay positioning for presentation slides
  const isPresentation = dataPresentationMode;
  const adjustedTopOffset = isPresentation ? (topOffsetPx as number) + 20 : topOffsetPx;
  const hudClass = isPresentation ? `hud hud--presentation` : `hud`;

  const px = (value: number | string) =>
    typeof value === "number" ? `${value}px` : value;
  return (
    <div
      className={`${hudClass} ${className ?? ""}`}
      style={{
        zIndex: uiTheme.zIndex.overlays,
        "--hud-offset-top": px(adjustedTopOffset),
        "--hud-offset-bottom": px(bottomOffsetPx),
        "--hud-offset-left": px(leftOffsetPx),
        "--hud-offset-right": px(rightOffsetPx),
      } as React.CSSProperties}
    >
      {/*
        NOTE:
        These HUD slots should size to their content. Using `w-full` here makes the slot containers span
        the full width of the viewport which can visually "stretch" backgrounds (e.g. legends/panels)
        and contribute to unexpected centering.
      */}
      <div className={`${slotBase} ${slotAlignment["top-left"]}`}>{topLeft}</div>
      <div className={`${slotBase} ${slotAlignment["top-center"]}`}>{topCenter}</div>
      <div className={`${slotBase} ${slotAlignment["top-right"]}`}>{topRight}</div>

      <div className={`${slotBase} ${slotAlignment["bottom-left"]}`}>{bottomLeft}</div>
      <div className={`${slotBase} ${slotAlignment["bottom-center"]}`}>{bottomCenter}</div>
      <div className={`${slotBase} ${slotAlignment["bottom-right"]}`}>{bottomRight}</div>
    </div>
  );
}