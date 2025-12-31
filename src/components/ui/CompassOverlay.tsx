'use client';
import { useEffect, useState } from 'react';

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
      try { 
          const rad = getHeading();
          // Cesium heading is in radians, clockwise from North.
          const d = (rad * 180) / Math.PI;
          // We convert to positive degrees 0-360
          // If heading is 90 (East), North is -90 (Left).
          // 360 - 90 = 270. Rotation 270 deg moves top (North) to Left.
          setDeg((360 - d) % 360); 
      } catch {}
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getHeading]);

  return (
    <div className={`pointer-events-none absolute left-6 bottom-24 select-none ${className}`}>
         <div className="bg-white/80 rounded-full w-16 h-16 flex items-center justify-center shadow-xl border-2 border-white/50 backdrop-blur-md">
            <svg
                viewBox="0 0 100 100"
                className="w-full h-full p-1"
                style={{ transform: `rotate(${deg}deg)` }}
            >
                {/* Decorative Ring */}
                <circle cx="50" cy="50" r="46" fill="none" stroke="#cbd5e1" strokeWidth="1" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="1 3" />
                
                {/* Cardinal Points */}
                <text x="50" y="16" textAnchor="middle" className="font-bold fill-red-600" style={{ fontSize: '14px', fontFamily: 'sans-serif' }}>N</text>
                <text x="50" y="94" textAnchor="middle" className="font-bold fill-slate-700" style={{ fontSize: '12px', fontFamily: 'sans-serif' }}>S</text>
                <text x="90" y="54" textAnchor="middle" className="font-bold fill-slate-700" style={{ fontSize: '12px', fontFamily: 'sans-serif' }}>E</text>
                <text x="10" y="54" textAnchor="middle" className="font-bold fill-slate-700" style={{ fontSize: '12px', fontFamily: 'sans-serif' }}>W</text>

                {/* Center Dot */}
                <circle cx="50" cy="50" r="3" fill="#475569" />

                {/* Needle Design */}
                <g>
                    {/* North (Red) Tip */}
                    <path d="M50 20 L56 50 L50 50 L44 50 Z" fill="#dc2626" />
                    {/* South (Dark) Tip */}
                    <path d="M50 80 L56 50 L50 50 L44 50 Z" fill="#1e293b" />
                </g>
            </svg>
         </div>
    </div>
  );
}