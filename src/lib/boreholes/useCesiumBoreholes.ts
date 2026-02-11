// src/lib/boreholes/useCesiumBoreholes.ts
import { useEffect, useRef, useState } from "react";
import { surfaceSnapAndSegment, BoreholeRowBase, BoreholeSegment } from "./borehole-core";
import { addBoreholeLayer, fitToBoreholeLayer, removeDataSource, BoreholeColorFn } from "./cesium-borehole-layer";

export function useCesiumBoreholes(
  viewer: any,
  rows: BoreholeRowBase[] | null,
  colorFn: BoreholeColorFn,
  options?: { radius?: number; name?: string; fit?: boolean }
) {
  const [ready, setReady] = useState(false);
  const dsRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!viewer || !rows || rows.length === 0) return;

      // 1) normalize + terrain snap
      const segs: BoreholeSegment[] = await surfaceSnapAndSegment(viewer, rows);

      if (cancelled) return;

      // 2) add layer
      dsRef.current = await addBoreholeLayer(viewer, segs, colorFn, { radius: options?.radius, name: options?.name });
      setReady(true);

      // 3) optional fit
      if (options?.fit) {
        await fitToBoreholeLayer(viewer, dsRef.current);
      }
    })();

    return () => {
      // cleanup
      cancelled = true;
      if (dsRef.current) {
        removeDataSource(viewer, dsRef.current);
        dsRef.current = null;
      }
      setReady(false);
    };
  }, [viewer, rows, colorFn, options?.radius, options?.name, options?.fit]);

  return { ready, dataSource: dsRef.current };
}
