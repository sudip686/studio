import { OverlaySlotContent, OverlaySlotKey } from "./slots";
import { uiTheme } from "./uiTheme";

type OverlayLayoutProps = OverlaySlotContent & {
  className?: string;
  leftOffsetPx?: number | string;
  rightOffsetPx?: number | string;
  topOffsetPx?: number | string;
  bottomOffsetPx?: number | string;
};

const slotBase = "flex flex-col gap-3 max-w-full";

const slotAlignment: Record<OverlaySlotKey, string> = {
  "top-left": "items-start",
  "top-center": "items-center",
  "top-right": "items-end",
  "bottom-left": "items-start justify-end",
  "bottom-center": "items-center justify-end",
  "bottom-right": "items-end justify-end",
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
      className={`pointer-events-none fixed inset-0 ${className ?? ""}`}
      style={{ zIndex: uiTheme.zIndex.overlays }}
    >
      <div
        className="absolute inset-0 p-4 md:p-6"
        style={{
          paddingTop: `calc(env(safe-area-inset-top) + ${px(topOffsetPx)})`,
          paddingBottom: `calc(env(safe-area-inset-bottom) + ${px(bottomOffsetPx)})`,
          paddingLeft: `calc(env(safe-area-inset-left) + ${px(leftOffsetPx)})`,
          paddingRight: `calc(env(safe-area-inset-right) + ${px(rightOffsetPx)})`,
        }}
      >
        <div className="grid h-full grid-cols-3 grid-rows-3 gap-4">
          <div className={`${slotBase} ${slotAlignment["top-left"]}`}>{topLeft}</div>
          <div className={`${slotBase} ${slotAlignment["top-center"]}`}>{topCenter}</div>
          <div className={`${slotBase} ${slotAlignment["top-right"]}`}>{topRight}</div>

          <div />
          <div />
          <div />

          <div className={`${slotBase} ${slotAlignment["bottom-left"]}`}>{bottomLeft}</div>
          <div className={`${slotBase} ${slotAlignment["bottom-center"]}`}>{bottomCenter}</div>
          <div className={`${slotBase} ${slotAlignment["bottom-right"]}`}>{bottomRight}</div>
        </div>
      </div>
    </div>
  );
}