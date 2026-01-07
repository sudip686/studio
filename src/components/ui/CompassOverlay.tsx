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
    <div className={`pointer-events-none select-none ${className}`}>
         <div className="bg-black/80 rounded-full w-48 h-48 flex items-center justify-center shadow-2xl border-4 border-orange-500 backdrop-blur-md relative">
            <div className="absolute top-3 right-3 text-2xl opacity-90 text-orange-400" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
              🧭
            </div>
            <svg
                viewBox="0 0 100 100"
                className="w-full h-full p-3"
                style={{ transform: `rotate(${deg}deg)` }}
            >
                <defs>
                    {/* Outer ring orange gradient */}
                    <radialGradient id="outerRing" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ff7f00" />
                        <stop offset="50%" stopColor="#ff4500" />
                        <stop offset="100%" stopColor="#cc3300" />
                    </radialGradient>

                    {/* Inner ring black */}
                    <radialGradient id="innerRing" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#000000" />
                        <stop offset="100%" stopColor="#333333" />
                    </radialGradient>

                    {/* Decorative ring grey */}
                    <radialGradient id="decorativeRing" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#666666" />
                        <stop offset="100%" stopColor="#999999" />
                    </radialGradient>

                    {/* North needle orange */}
                    <linearGradient id="northGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ff7f00" />
                        <stop offset="50%" stopColor="#ff4500" />
                        <stop offset="100%" stopColor="#cc3300" />
                    </linearGradient>

                    {/* South needle black */}
                    <linearGradient id="southGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#000000" />
                        <stop offset="100%" stopColor="#333333" />
                    </linearGradient>

                    {/* Center glow grey */}
                    <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#cccccc" />
                        <stop offset="100%" stopColor="#666666" />
                    </radialGradient>
                </defs>

                {/* Multiple concentric rings */}
                <circle cx="50" cy="50" r="49" fill="none" stroke="url(#outerRing)" strokeWidth="4" opacity="0.9" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="url(#innerRing)" strokeWidth="3" strokeDasharray="4 8" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="url(#decorativeRing)" strokeWidth="2" opacity="0.7" />

                {/* Cardinal Points with orange and grey */}
                <text x="50" y="12" textAnchor="middle" className="font-black fill-orange-400" style={{ fontSize: '36px', fontFamily: 'sans-serif', filter: 'drop-shadow(0 0 6px rgba(255, 127, 0, 0.8))' }}>N</text>
                <text x="50" y="98" textAnchor="middle" className="font-bold text-grey-300" style={{ fontSize: '32px', fontFamily: 'sans-serif', filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))' }}>S</text>
                <text x="94" y="54" textAnchor="middle" className="font-bold text-grey-300" style={{ fontSize: '32px', fontFamily: 'sans-serif', filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))' }}>E</text>
                <text x="6" y="54" textAnchor="middle" className="font-bold text-grey-300" style={{ fontSize: '32px', fontFamily: 'sans-serif', filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))' }}>W</text>

                {/* Degree markers */}
                <g opacity="0.8">
                    {Array.from({ length: 36 }, (_, i) => {
                        const angle = (i * 10) * Math.PI / 180;
                        const x1 = (50 + 42 * Math.cos(angle - Math.PI/2)).toFixed(2);
                        const y1 = (50 + 42 * Math.sin(angle - Math.PI/2)).toFixed(2);
                        const x2 = (50 + 38 * Math.cos(angle - Math.PI/2)).toFixed(2);
                        const y2 = (50 + 38 * Math.sin(angle - Math.PI/2)).toFixed(2);
                        return (
                            <line
                                key={i}
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke={i % 9 === 0 ? "#666666" : "#cccccc"}
                                strokeWidth={i % 9 === 0 ? "2" : "1"}
                            />
                        );
                    })}
                </g>

                {/* Center */}
                <circle cx="50" cy="50" r="8" fill="url(#centerGlow)" />
                <circle cx="50" cy="50" r="6" fill="#000000" stroke="#cccccc" strokeWidth="1" />
                <circle cx="50" cy="50" r="3" fill="#666666" />

                {/* Enhanced needle */}
                <g filter="drop-shadow(0 3px 6px rgba(0,0,0,0.5))">
                    <path d="M50 10 L62 50 L50 50 L38 50 Z" fill="url(#northGradient)" stroke="#cc3300" strokeWidth="2" />
                    <path d="M50 90 L62 50 L50 50 L38 50 Z" fill="url(#southGradient)" stroke="#000000" strokeWidth="2" />
                </g>
            </svg>
         </div>
    </div>
  );
}
