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
    <div className={`pointer-events-none ${className}`}>
      <div className="flex flex-col items-start">
        {/* Enhanced scale bar with orange-black-grey gradient */}
        <div
          className="h-12 shadow-2xl rounded-xl border-4 border-orange-500 relative overflow-hidden"
          style={{
            width: `${Math.max(barPx * 3, 240)}px`,
            background: 'linear-gradient(90deg, #ff7f00 0%, #000000 25%, #666666 50%, #ff4500 75%, #333333 100%)',
            boxShadow: '0 0 20px rgba(255, 127, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          }}
        >
          {/* Scale markings */}
          <div className="absolute inset-0 flex items-center justify-between px-3">
            <div className="w-2 h-8 bg-grey-300 rounded-full shadow-md"></div>
            <div className="w-2 h-8 bg-grey-300 rounded-full shadow-md"></div>
          </div>
        </div>

        {/* Enhanced label with black background and orange text */}
        <div className="mt-4 text-orange-400 text-2xl font-black drop-shadow-2xl px-5 py-3 rounded-xl relative bg-black/80 border-3 border-grey-500"
             style={{
               boxShadow: '0 0 15px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 127, 0, 0.1)',
               textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
               border: '3px solid #666666'
             }}>
          📏 {label}
        </div>
      </div>
    </div>
  );
}
