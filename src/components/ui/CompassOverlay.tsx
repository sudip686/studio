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
          // Convert radians to degrees and normalize to 0-360
          const d = (rad * 180) / Math.PI;
          // For compass: 0° = North at top, so we rotate the compass housing
          // Cesium heading: 0 = North, increases clockwise
          // Three.js heading: atan2(z, x) gives angle from positive X axis
          setDeg(d % 360);
      } catch {}
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getHeading]);

  return (
    <div className={`pointer-events-none select-none absolute right-1/2 bottom-4 translate-x-1/2 ${className}`}>
      <div className="relative">
        {/* Enhanced multi-layer glow effects */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/30 via-blue-500/40 to-purple-600/30 blur-2xl animate-pulse" />
        <div className="absolute inset-2 rounded-full bg-gradient-to-r from-emerald-400/20 via-blue-400/30 to-indigo-500/20 blur-xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute inset-4 rounded-full bg-gradient-to-r from-rose-400/15 via-violet-400/25 to-cyan-400/15 blur-lg animate-pulse" style={{ animationDelay: '1s' }} />

        {/* Main compass container with premium styling */}
        <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-full w-36 h-36 flex items-center justify-center shadow-2xl border-2 border-gradient-to-r from-cyan-500/60 via-blue-500/60 to-purple-500/60 backdrop-blur-sm">
          {/* Inner rim with metallic effect */}
          <div className="absolute inset-1 rounded-full bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 border border-slate-600/50 shadow-inner" />

          {/* Compass rose with enhanced gradients */}
          <div className="absolute inset-2 rounded-full overflow-hidden">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(
                  from 0deg,
                  #dc2626 0deg 90deg,     /* Red - North */
                  #2563eb 90deg 180deg,   /* Blue - East */
                  #16a34a 180deg 270deg,  /* Green - South */
                  #9333ea 270deg 360deg   /* Purple - West */
                )`,
                opacity: 0.15
              }}
            />
            {/* Subtle inner pattern */}
            <div
              className="absolute inset-4 rounded-full"
              style={{
                background: `radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)`
              }}
            />
          </div>

          {/* Compass housing with cardinal directions */}
          <div className="relative w-full h-full rounded-full">
            {/* Enhanced cardinal direction markers */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full h-full">
                {/* North with enhanced styling */}
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-red-300 font-black text-lg drop-shadow-lg" style={{
                  textShadow: '0 0 8px rgba(239, 68, 68, 0.8), 2px 2px 4px rgba(0,0,0,0.9)',
                  filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.6))'
                }}>
                  N
                </div>
                {/* South */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-cyan-300 font-black text-lg drop-shadow-lg" style={{
                  textShadow: '0 0 8px rgba(34, 211, 238, 0.8), 2px 2px 4px rgba(0,0,0,0.9)',
                  filter: 'drop-shadow(0 0 4px rgba(34, 211, 238, 0.6))'
                }}>
                  S
                </div>
                {/* East */}
                <div className="absolute top-1/2 right-2 transform -translate-y-1/2 text-emerald-300 font-black text-lg drop-shadow-lg" style={{
                  textShadow: '0 0 8px rgba(16, 185, 129, 0.8), 2px 2px 4px rgba(0,0,0,0.9)',
                  filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.6))'
                }}>
                  E
                </div>
                {/* West */}
                <div className="absolute top-1/2 left-2 transform -translate-y-1/2 text-purple-300 font-black text-lg drop-shadow-lg" style={{
                  textShadow: '0 0 8px rgba(139, 92, 246, 0.8), 2px 2px 4px rgba(0,0,0,0.9)',
                  filter: 'drop-shadow(0 0 4px rgba(139, 92, 246, 0.6))'
                }}>
                  W
                </div>
              </div>
            </div>

            {/* Enhanced degree markers */}
            <div className="absolute inset-0">
              {Array.from({ length: 12 }, (_, i) => {
                const angle = (i * 30) * Math.PI / 180;
                const x = Number((50 + 47 * Math.cos(angle - Math.PI/2)).toFixed(6));
                const y = Number((50 + 47 * Math.sin(angle - Math.PI/2)).toFixed(6));
                const isCardinal = i % 3 === 0; // Every 90 degrees
                return (
                  <div
                    key={i}
                    className={`absolute ${isCardinal ? 'w-1 h-3 bg-gradient-to-t from-cyan-400 to-blue-400' : 'w-0.5 h-2 bg-gradient-to-t from-slate-400 to-slate-300'} shadow-sm`}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: `translate(-50%, -50%) rotate(${i * 30}deg)`,
                      transformOrigin: '50% 100%',
                      boxShadow: isCardinal ? '0 0 4px rgba(34, 211, 238, 0.4)' : '0 0 2px rgba(148, 163, 184, 0.3)'
                    }}
                  />
                );
              })}
            </div>

            {/* Enhanced compass needle with premium styling */}
            <div
              className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out"
              style={{ transform: `rotate(${deg}deg)` }}
            >
              <div className="relative">
                {/* North needle with enhanced gradient and glow */}
                <div className="absolute w-1.5 h-14 bg-gradient-to-t from-red-500 via-red-400 to-red-300 rounded-full shadow-xl"
                     style={{
                       transform: 'translateX(-50%) translateY(-100%)',
                       boxShadow: '0 0 12px rgba(239, 68, 68, 0.8), 0 0 24px rgba(239, 68, 68, 0.4)'
                     }} />
                <div className="absolute w-4 h-4 bg-gradient-to-br from-red-400 to-red-600 rounded-full shadow-xl border border-red-300"
                     style={{
                       transform: 'translateX(-50%) translateY(-160%)',
                       boxShadow: '0 0 8px rgba(239, 68, 68, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                     }} />

                {/* South needle with complementary styling */}
                <div className="absolute w-1.5 h-10 bg-gradient-to-b from-cyan-500 via-cyan-400 to-cyan-300 rounded-full shadow-xl"
                     style={{
                       transform: 'translateX(-50%) translateY(0%)',
                       boxShadow: '0 0 12px rgba(34, 211, 238, 0.8), 0 0 24px rgba(34, 211, 238, 0.4)'
                     }} />
                <div className="absolute w-3 h-3 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full shadow-xl border border-cyan-300"
                     style={{
                       transform: 'translateX(-50%) translateY(220%)',
                       boxShadow: '0 0 6px rgba(34, 211, 238, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                     }} />
              </div>
            </div>

            {/* Enhanced center pivot with metallic effect */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 bg-gradient-to-br from-slate-300 via-slate-200 to-slate-400 rounded-full border-2 border-slate-500 shadow-inner relative">
                <div className="absolute inset-0.5 bg-gradient-to-br from-slate-100 to-slate-300 rounded-full shadow-lg" />
                <div className="absolute inset-1 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full shadow-inner" />
                <div className="absolute inset-2 bg-slate-800 rounded-full" />
              </div>
            </div>
          </div>

          {/* Enhanced compass icon with glow */}
          <div className="absolute -top-3 -right-3 text-2xl opacity-90 animate-pulse" style={{
            textShadow: '0 0 12px rgba(34, 211, 238, 0.8), 2px 2px 6px rgba(0,0,0,0.9)',
            filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.6))'
          }}>
            🧭
          </div>

          {/* Outer decorative ring */}
          <div className="absolute inset-0 rounded-full border-2 border-gradient-to-r from-cyan-500/40 via-transparent to-purple-500/40 animate-spin" style={{ animationDuration: '20s' }} />
        </div>
      </div>
    </div>
  );
}