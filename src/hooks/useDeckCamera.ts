"use client";

import { useEffect } from "react";
import type { DeckCamera } from "@/lib/deck";
import { useCesium } from "@/contexts/cesium-context";

export function useDeckCamera(camera?: DeckCamera) {
  const { viewer, ready } = useCesium();

  useEffect(() => {
    if (!viewer || !ready || !camera) return;
    const Cesium = (window as any).Cesium;
    if (!Cesium) return;

    const destination = Cesium.Cartesian3.fromDegrees(
      camera.lon,
      camera.lat,
      camera.height
    );

    viewer.camera.cancelFlight?.();
    viewer.camera.flyTo({
      destination,
      duration: camera.duration ?? 2.0,
      orientation: {
        heading: Cesium.Math.toRadians(camera.heading ?? 0),
        pitch: Cesium.Math.toRadians(camera.pitch ?? -30),
        roll: 0,
      },
      easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
    });
  }, [viewer, ready, camera]);
}