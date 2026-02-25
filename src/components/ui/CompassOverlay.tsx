import { useState, useEffect } from 'react';

interface CompassOverlayProps {
  mode?: 'cesium' | 'three';
  getHeading?: () => number;
  headingUnit?: 'radians' | 'degrees';
  className?: string;
}

export function CompassOverlay({ mode, getHeading, headingUnit = 'radians', className }: CompassOverlayProps) {
  const [heading, setHeading] = useState(0);

  useEffect(() => {
    if (!getHeading) {
        setHeading(0);
        return;
    }

    let animationFrameId: number;

    const update = () => {
      setHeading(getHeading());
      animationFrameId = requestAnimationFrame(update);
    };

    update();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [getHeading]);

  const rotation = headingUnit === 'degrees' ? heading : (heading * 180) / Math.PI; // Convert radians to degrees

  return (
    <div className={`flex flex-col items-center pointer-events-auto ${className || ''}`}>
      <div className="relative h-24 w-24 rounded-full bg-black/60 border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-md flex items-center justify-center">
        <div className="absolute inset-1 rounded-full border border-white/10" />
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/5 via-transparent to-black/30" />

        <div className="absolute inset-0 rounded-full">
          {[...Array(12)].map((_, i) => {
            const angle = i * 30 - 90;
            const isMain = i % 3 === 0;
            return (
              <div
                key={i}
                className={`absolute left-1/2 top-1 origin-bottom ${
                  isMain ? 'h-3 w-0.5 bg-orange-400' : 'h-2 w-px bg-white/40'
                }`}
                style={{ transform: `rotate(${angle}deg) translateX(-50%) translateY(-10px)` }}
              />
            );
          })}
        </div>

        <span className="absolute top-1 text-[11px] font-semibold text-orange-300">N</span>
        <span className="absolute bottom-1 text-[10px] font-semibold text-white/80">S</span>
        <span className="absolute right-1 text-[10px] font-semibold text-white/80">E</span>
        <span className="absolute left-1 text-[10px] font-semibold text-white/80">W</span>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="relative"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <div className="w-0.5 h-8 bg-gradient-to-t from-red-500 to-red-300 rounded-sm shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[8px] border-transparent border-b-red-500" />
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-white/70 rounded-sm" />
          </div>
        </div>

        <div className="absolute h-2.5 w-2.5 rounded-full bg-white/80 border border-white/30 shadow" />
      </div>
    </div>
  );
}