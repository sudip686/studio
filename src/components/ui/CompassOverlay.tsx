import { useState, useEffect } from 'react';
import Image from 'next/image';

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
    <div className={`flex flex-col items-center ${className || ''}`}>
      {/* Premium Compass Design */}
      <div className="relative h-32 w-32 rounded-full bg-gradient-to-br from-white/95 via-white/90 to-white/85 border-3 border-orange-500/70 flex items-center justify-center shadow-[0_12px_50px_rgba(0,0,0,0.25)] backdrop-blur-sm">

        {/* Elegant outer decorative ring */}
        <div className="absolute inset-0 rounded-full border-2 border-orange-400/40 shadow-inner" />
        <div className="absolute inset-1 rounded-full border border-orange-300/30" />

        {/* Sophisticated degree markings */}
        <div className="absolute inset-0 rounded-full">
          {[...Array(72)].map((_, i) => {
            const angle = (i * 5) - 90; // 5-degree increments for precision
            const isMain = i % 18 === 0; // Every 90 degrees (18 * 5)
            const isMedium = i % 9 === 0 && !isMain; // Every 45 degrees
            const isSmall = i % 3 === 0 && !isMain && !isMedium; // Every 15 degrees
            return (
              <div
                key={i}
                className={`absolute ${isMain ? 'w-1 h-4 bg-orange-600' : isMedium ? 'w-0.5 h-3 bg-orange-500' : isSmall ? 'w-0.5 h-2 bg-orange-400/60' : 'w-0.5 h-1 bg-gray-500/40'} left-1/2 top-1 origin-bottom`}
                style={{
                  transform: `rotate(${angle}deg) translateX(-50%) translateY(-${isMain ? '24px' : isMedium ? '20px' : isSmall ? '16px' : '12px'})`
                }}
              />
            );
          })}
        </div>

        {/* Concentric decorative rings */}
        <div className="absolute h-24 w-24 rounded-full border border-orange-400/20 bg-gradient-to-br from-orange-50/30 to-transparent shadow-inner" />
        <div className="absolute h-20 w-20 rounded-full border border-orange-300/30 bg-gradient-to-br from-white/40 to-transparent" />
        <div className="absolute h-16 w-16 rounded-full border-2 border-orange-400/40 bg-gradient-to-br from-orange-50/20 to-transparent shadow-lg" />

        {/* Premium cardinal directions */}
        <span className="absolute top-1.5 text-[16px] font-black text-orange-600 drop-shadow-[0_2px_4px_rgba(249,115,22,0.9)] tracking-wider">
          N
        </span>
        <span className="absolute bottom-1.5 text-[14px] font-bold text-gray-700 drop-shadow-md">
          S
        </span>
        <span className="absolute right-1.5 text-[14px] font-bold text-gray-700 drop-shadow-md">
          E
        </span>
        <span className="absolute left-1.5 text-[14px] font-bold text-gray-700 drop-shadow-md">
          W
        </span>

        {/* Elegant intercardinal directions */}
        <span className="absolute top-3 right-4 text-[11px] font-semibold text-orange-500/90 drop-shadow-sm transform rotate-45">
          NE
        </span>
        <span className="absolute top-3 left-4 text-[11px] font-semibold text-orange-500/90 drop-shadow-sm transform -rotate-45">
          NW
        </span>
        <span className="absolute bottom-3 right-4 text-[11px] font-semibold text-orange-500/90 drop-shadow-sm transform -rotate-45">
          SE
        </span>
        <span className="absolute bottom-3 left-4 text-[11px] font-semibold text-orange-500/90 drop-shadow-sm transform rotate-45">
          SW
        </span>

        {/* Central logo as centerpiece */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full overflow-hidden border-3 border-orange-500/80 shadow-[0_4px_16px_rgba(249,115,22,0.6)] bg-white">
          <Image
            src="/A_Logo.png"
            alt="Company Logo Centerpiece"
            width={48}
            height={48}
            className="w-full h-full object-cover"
          />
          {/* Logo glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 via-transparent to-orange-600/20 rounded-full" />
        </div>

        {/* Premium needle design */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="relative transition-transform duration-500 ease-out"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {/* Main needle with metallic gradient */}
            <div className="w-1.5 h-8 bg-gradient-to-t from-red-600 via-red-500 to-red-400 shadow-[0_0_8px_rgba(239,68,68,0.8)] rounded-sm" />
            {/* Arrow head with premium styling */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[10px] border-transparent border-b-red-600 shadow-[0_0_10px_rgba(239,68,68,1)]" />
            {/* Counter needle with elegance */}
            <div className="w-1 h-4 bg-gradient-to-t from-gray-600 to-gray-400 -mt-8 rounded-sm shadow-md" />
            {/* Needle base with subtle animation */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full shadow-lg border border-orange-300">
              <div className="absolute inset-0 bg-orange-300/60 rounded-full animate-pulse" />
            </div>
          </div>
        </div>

        {/* Subtle inner highlights and shadows */}
        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white/10 via-transparent to-gray-900/5 pointer-events-none shadow-inner" />
        <div className="absolute inset-8 rounded-full bg-gradient-to-tl from-orange-400/5 to-transparent pointer-events-none" />

        {/* Elegant outer glow */}
        <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-orange-400/10 via-orange-500/5 to-orange-600/10 blur-sm -z-10" />
      </div>
    </div>
  );
}