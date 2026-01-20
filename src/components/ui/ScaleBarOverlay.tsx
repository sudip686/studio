'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  camera: any; // THREE.Camera | null;
  rendererDom: HTMLCanvasElement | null;
  THREE: any; // THREE instance
  planeY?: number;           // ground plane Y (default 0)
  targetWidthPx?: number;    // desired visual length (px) we try to approximate
  units?: 'm';               // future extension (km/ft/etc.)
};

export function ScaleBarOverlay({
  camera,
  rendererDom,
  THREE, // Destructure THREE prop
  planeY = 0,
  targetWidthPx = 140,
  units = 'm',
}: Props) {
  const [px, setPx] = useState(100);
  const [label, setLabel] = useState('100 m');

  const plane = useMemo(() => {
    // horizontal plane y = planeY
    return new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
  }, [planeY]);

  useEffect(() => {
    if (!camera || !rendererDom) return;

    const ray = new THREE.Ray();
    const ndcToRay = (xNdc: number, yNdc: number, out: any) => {
      // from NDC to world ray
      const origin = new THREE.Vector3();
      const direction = new THREE.Vector3();
      origin.setFromMatrixPosition(camera.matrixWorld);
      direction.set(xNdc, yNdc, 0.5).unproject(camera).sub(origin).normalize();
      out.origin.copy(origin);
      out.direction.copy(direction);
    };

    const compute = () => {
      const w = rendererDom.clientWidth;
      const h = rendererDom.clientHeight;
      if (w <= 2 || h <= 2) return;

      // two points near the bottom-center of the screen, separated horizontally
      const yNdc = (h - 30) / h * 2 - 1; // ~30px above bottom
      const x1Ndc = (w / 2 - targetWidthPx / 2) / w * 2 - 1;
      const x2Ndc = (w / 2 + targetWidthPx / 2) / w * 2 - 1;

      ndcToRay(x1Ndc, yNdc, ray);
      const p1 = new THREE.Vector3();
      ray.intersectPlane(plane, p1);

      ndcToRay(x2Ndc, yNdc, ray);
      const p2 = new THREE.Vector3();
      ray.intersectPlane(plane, p2);

      if (!p1 || !p2 || !isFinite(p1.x) || !isFinite(p2.x)) return;

      const distMeters = p1.distanceTo(p2);

      if (distMeters < 1e-6) { // Handle very small or zero distances
        setPx(1); // Set to a minimal width
        setLabel(`0 ${units}`);
        return;
      }

      // choose a "nice" rounded value close to distMeters
      const niceSteps = [1, 2, 5];
      const pow10 = Math.pow(10, Math.floor(Math.log10(distMeters || 1)));
      let best = pow10;
      for (const s of niceSteps) {
        const candidate = s * pow10;
        if (Math.abs(candidate - distMeters) < Math.abs(best - distMeters)) best = candidate;
      }
      // if still far, nudge up/down a decade
      if (distMeters / best > 2.5) best *= 2;
      if (best / distMeters > 2.5) best /= 2;

      // convert that "best meters" back to pixels at the same screen row
      // we assume linearity over this small span, so px ≈ targetWidthPx * (best / distMeters)
      const widthPx = Math.max(1, Math.round(targetWidthPx * (best / distMeters)));

      setPx(widthPx);
      setLabel(`${formatMeters(best)} ${units}`);
    };

    const onChange = () => requestAnimationFrame(compute);
    compute();

    const obs = new ResizeObserver(onChange);
    obs.observe(rendererDom);

    // If you have OrbitControls, listen to 'change' from outside and call onChange().
    // Otherwise, we can poll modestly:
    const id = setInterval(onChange, 200);

    return () => {
      clearInterval(id);
      obs.disconnect();
    };
  }, [camera, rendererDom, plane]);

  return (
    <div className="pointer-events-none select-none absolute bottom-4 left-4">
      <div className="flex items-center gap-2 text-orange-400">
        <div className="h-2 bg-orange-500/90 rounded-sm shadow transition-all duration-200" style={{ width: px }} />
        <div className="text-xs bg-black/60 px-2 py-0.5 rounded border border-gray-500/30 transition-all duration-200">{label}</div>
      </div>
    </div>
  );
}

function formatMeters(m: number) {
  if (m >= 1000) return `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 2)} km`.replace('.00','');
  return `${m.toFixed(m % 1 === 0 ? 0 : 2)}`.replace('.00','');
}
