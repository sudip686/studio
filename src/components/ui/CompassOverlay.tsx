'use client';
import { useEffect, useRef, useState } from 'react';

type Mode = 'three' | 'cesium';

export default function CompassOverlay({
  mode,
  getHeading,        // () => number in radians (0 = north)
  className = '',
}: {
  mode: Mode;
  getHeading: () => number;
  className?: string;
}) {
  const [deg, setDeg] = useState(0);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      try { setDeg((-getHeading() * 180) / Math.PI); } catch {}
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getHeading]);

  return (
    <div className={`pointer-events-none absolute left-6 bottom-24 select-none ${className}`}>
      <div className="relative w-20 h-20 rounded-full bg-white/90 shadow-xl">
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: `rotate(${deg}deg)`, transition: 'transform 80ms linear' }}
        >
          <div className="absolute top-1 text-red-600 font-bold">N</div>
          <div className="absolute bottom-1 text-gray-400">S</div>
          <div className="absolute left-1/2 -translate-x-1/2 top-2 w-0.5 h-6 bg-red-600 rounded origin-bottom" />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-2 w-0.5 h-6 bg-gray-500 rounded origin-top" />
        </div>
      </div>
    </div>
  );
}