import { useState, useEffect } from 'react';

interface CompassOverlayProps {
  mode?: 'cesium' | 'three';
  getHeading?: () => number;
  className?: string;
}

export function CompassOverlay({ mode, getHeading, className }: CompassOverlayProps) {
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

  const rotation = (heading * 180) / Math.PI; // Convert radians to degrees

  return (
    <div className={`flex items-center gap-3 ${className || ''}`}>
      <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-black/80 via-black/70 to-black/60 border border-white/25 flex items-center justify-center shadow-2xl backdrop-blur-md">
        {/* Outer ring with degree markings */}
        <div className="absolute inset-0 rounded-full">
          {[...Array(12)].map((_, i) => {
            const angle = (i * 30) - 90; // Start from top
            const isMain = i % 3 === 0;
            return (
              <div
                key={i}
                className={`absolute w-0.5 ${isMain ? 'h-2 bg-orange-500/80' : 'h-1 bg-gray-400/60'} left-1/2 top-1 origin-bottom`}
                style={{
                  transform: `rotate(${angle}deg) translateX(-50%) translateY(-${isMain ? '16px' : '12px'})`
                }}
              />
            );
          })}
        </div>

        {/* Inner circle */}
        <div className="h-16 w-16 rounded-full border-2 border-gray-500/40 bg-gradient-to-br from-gray-600/10 to-transparent" />

        {/* Cardinal directions */}
        <span className="absolute top-1 text-[13px] font-bold text-orange-400 drop-shadow-lg tracking-wider">
          N
        </span>
        <span className="absolute bottom-1 text-[11px] text-gray-300 font-semibold drop-shadow-md">
          S
        </span>
        <span className="absolute right-1 text-[11px] text-gray-300 font-semibold drop-shadow-md">
          E
        </span>
        <span className="absolute left-1 text-[11px] text-gray-300 font-semibold drop-shadow-md">
          W
        </span>

        {/* Intercardinal directions */}
        <span className="absolute top-2 right-3 text-[9px] text-gray-400 font-medium drop-shadow-sm transform rotate-45">
          NE
        </span>
        <span className="absolute top-2 left-3 text-[9px] text-gray-400 font-medium drop-shadow-sm transform -rotate-45">
          NW
        </span>
        <span className="absolute bottom-2 right-3 text-[9px] text-gray-400 font-medium drop-shadow-sm transform -rotate-45">
          SE
        </span>
        <span className="absolute bottom-2 left-3 text-[9px] text-gray-400 font-medium drop-shadow-sm transform rotate-45">
          SW
        </span>

        {/* Heading indicator needle with arrow */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="relative"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {/* Main needle */}
            <div className="w-0.5 h-6 bg-gradient-to-t from-orange-500 to-orange-400 shadow-lg transition-all duration-200" />
            {/* Arrow head */}
            <div
              className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-r-[3px] border-b-[6px] border-transparent border-b-orange-400 shadow-sm transition-all duration-200"
              style={{ transform: 'translateY(-2px)' }}
            />
            {/* Counter needle */}
            <div className="w-0.5 h-2 bg-gray-400/50 -mt-6 transition-all duration-200" />
          </div>
        </div>

        {/* Center dot with glow */}
        <div className="absolute w-2 h-2 bg-orange-500 rounded-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shadow-lg">
          <div className="absolute inset-0 bg-orange-400/50 rounded-full animate-pulse" />
        </div>

        {/* Subtle inner highlight */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-gray-400/5 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
