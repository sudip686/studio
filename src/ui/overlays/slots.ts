export type OverlaySlotKey =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export const OVERLAY_SLOTS: OverlaySlotKey[] = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

export const OVERLAY_Z_INDEX = {
  overlays: 1000,
  tooltips: 1100,
  drawers: 1200,
  toasts: 1300,
} as const;

export type OverlaySlotContent = Partial<Record<OverlaySlotKey, React.ReactNode>>;