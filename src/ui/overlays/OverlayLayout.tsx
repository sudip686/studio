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
}: OverlayLayoutProps) {
  const px = (value: number | string) =>
    typeof value === "number" ? `${value}px` : value;
  return (
    <div
      className={`hud ${className ?? ""}`}
      style={{
        zIndex: uiTheme.zIndex.overlays,
        "--hud-offset-top": px(topOffsetPx),
        "--hud-offset-bottom": px(bottomOffsetPx),
        "--hud-offset-left": px(leftOffsetPx),
        "--hud-offset-right": px(rightOffsetPx),
      } as React.CSSProperties}
    >
      <div className={`${slotBase} ${slotAlignment["top-left"]} w-full`}>{topLeft}</div>
      <div className={`${slotBase} ${slotAlignment["top-center"]} w-full`}>{topCenter}</div>
      <div className={`${slotBase} ${slotAlignment["top-right"]} w-full`}>{topRight}</div>

      <div className={`${slotBase} ${slotAlignment["bottom-left"]} w-full`}>{bottomLeft}</div>
      <div className={`${slotBase} ${slotAlignment["bottom-center"]} w-full`}>{bottomCenter}</div>
      <div className={`${slotBase} ${slotAlignment["bottom-right"]} w-full`}>{bottomRight}</div>
    </div>
  );
}