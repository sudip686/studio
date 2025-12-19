'use client';
import { useEffect, useRef, useState } from 'react';

type Mode = 'three' | 'cesium';

function niceStep(metersPer100px: number) {
  // pick a nice display length close to 100px: {5,10,20,50} × 10^n
  const raw = metersPer100px;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const candidates = [1, 2, 5, 10].map(c => c * pow);
  let best = candidates[0];
  let diff = Math.abs(candidates[0] - raw);
  for (const c of candidates) {
    const d = Math.abs(c - raw);
    if (d < diff) { best = c; diff = d; }
  }
  return best;
}

export default function MetricScaleOverlay({
  mode,
  getMetersIn100px,       // () => number (meters represented by 100 screen px at ground)
  className = '',
}: {
  mode: Mode;
  getMetersIn100px: () => number;
  className?: string;
}) {
  const [label, setLabel] = useState('—');
  const [barPx, setBarPx] = useState(100);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      try {
        const meters100 = getMetersIn100px();
        if (Number.isFinite(meters100) && meters100 > 0) {
          const nice = niceStep(meters100);
          const px = (nice / meters100) * 100;
          setBarPx(px);
          setLabel(nice >= 1000 ? `${(nice/1000).toFixed(nice>=10000?0:1)} km` : `${Math.round(nice)} m`);
        }
      } catch {}
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getMetersIn100px]);

  return (
    <div className={`pointer-events-none absolute left-6 bottom-6 ${className}`}>
      <div className="flex flex-col items-start">
        <div className="h-2 bg-white/90 shadow rounded" style={{ width: `${barPx}px` }} />
        <div className="mt-1 text-white/90 text-xs font-semibold drop-shadow">{label}</div>
      </div>
    </div>
  );
}
