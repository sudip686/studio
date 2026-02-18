'use client';
import { useEffect, useRef } from 'react';

export default function SurveyGridCesium({
  viewer,
  origin,               // { lon, lat, height } for ENU frame
  size = 4000,          // meters (square)
  spacing = 100,
  majorEvery = 5,       // every n-th line is major
  altitude = 0,         // offset above terrain
  show = true,
}: {
  viewer: any;
  origin: { lon: number; lat: number; height?: number };
  size?: number;
  spacing?: number;
  majorEvery?: number;
  altitude?: number;
  show?: boolean;
}) {
  const ref = useRef<{ polylines?: any; labels?: any } | null>(null);

  useEffect(() => {
    if (!viewer || !show) return;
    const Cesium = (window as any).Cesium;
    const scene = viewer.scene;

    // collections
    const pcs = new Cesium.PolylineCollection({ show });
    const labels = new Cesium.LabelCollection({ show });
    scene.primitives.add(pcs);
    scene.primitives.add(labels);

    const toWorld = (() => {
      const enu = Cesium.Transforms.eastNorthUpToFixedFrame(
        Cesium.Cartesian3.fromDegrees(origin.lon, origin.lat, origin.height ?? 0)
      );
      const out = new Cesium.Cartesian3();
      return (x: number, y: number, z: number) => {
        return Cesium.Matrix4.multiplyByPoint(enu, new Cesium.Cartesian3(x, y, z + altitude), out.clone());
      };
    })();

    const half = size / 2;
    const n = Math.floor(size / spacing);
    let idx = 0;
    for (let i = -n; i <= n; i++) {
      const v = i * spacing;

      const isMajor = (Math.abs(i) % majorEvery) === 0;
      const width = isMajor ? 2.5 : 1.0;
      const color = isMajor ? Cesium.Color.WHITE.withAlpha(0.35) : Cesium.Color.GRAY.withAlpha(0.25);

      // north-south line (x fixed)
      pcs.add({
        positions: [toWorld(v, -half, 0), toWorld(v, half, 0)],
        width, material: color,
      });
      // east-west line (y fixed)
      pcs.add({
        positions: [toWorld(-half, v, 0), toWorld(half, v, 0)],
        width, material: color,
      });

      if (isMajor && i !== 0) {
        labels.add({
          position: toWorld(v, -half, 0),
          text: `${v} m`,
          pixelOffset: new Cesium.Cartesian2(0, -12),
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
          font: '12px Inter, sans-serif',
        });
        labels.add({
          position: toWorld(-half, v, 0),
          text: `${v} m`,
          pixelOffset: new Cesium.Cartesian2(-12, 0),
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
          font: '12px Inter, sans-serif',
        });
      }
      idx++;
    }

    viewer.scene.requestRender();
    ref.current = { polylines: pcs, labels };

    return () => {
      if (ref.current?.polylines) scene.primitives.remove(ref.current.polylines);
      if (ref.current?.labels) scene.primitives.remove(ref.current.labels);
      ref.current = null;
    };
  }, [viewer, origin.lon, origin.lat, origin.height, size, spacing, majorEvery, altitude, show]);

  return null;
}
