"use client";

import type { DeckCamera } from "@/lib/deck";
import { useDeckCamera } from "@/hooks/useDeckCamera";

export function DeckCameraController({ camera }: { camera?: DeckCamera }) {
  useDeckCamera(camera);
  return null;
}