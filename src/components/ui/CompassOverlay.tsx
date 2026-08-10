import { useEffect, useRef, useState } from 'react';

interface CompassOverlayProps {
  mode?: 'cesium' | 'three';
  getHeading?: () => number;
  headingUnit?: 'radians' | 'degrees';
  className?: string;
}

export function CompassOverlay({ mode, getHeading, headingUnit = 'radians', className }: CompassOverlayProps) {
  const [heading, setHeading] = useState(0);
  const getHeadingRef = useRef(getHeading);

  useEffect(() => {
    getHeadingRef.current = getHeading;
  }, [getHeading]);

  useEffect(() => {
    if (!getHeadingRef.current) {
      setHeading(0);
      return;
    }

    let animationFrameId: number;

    const update = () => {
      if (getHeadingRef.current) {
        setHeading(getHeadingRef.current());
      }
      animationFrameId = requestAnimationFrame(update);
    };

    update();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const rotation = headingUnit === 'degrees' ? heading : (heading * 180) / Math.PI;
  const headingDegrees = ((rotation % 360) + 360) % 360;
  const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const headingCardinal = cardinals[Math.round(headingDegrees / 45) % cardinals.length];

  return (
    <div className={`flex flex-col items-center pointer-events-auto ${className || ''}`}>
      <div className="relative overflow-hidden rounded-[22px] border border-[#f1d2bf]/14 bg-[linear-gradient(180deg,rgba(18,14,13,0.96),rgba(10,9,9,0.88))] px-3 py-2.5 shadow-[0_18px_42px_rgba(0,0,0,0.26)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(241,210,191,0.14),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(204,90,40,0.12),transparent_36%)]" />
        <div className="relative flex items-center gap-3">
          <div className="relative flex h-[4.4rem] w-[4.4rem] items-center justify-center rounded-full border border-[#f1d2bf]/14 bg-[radial-gradient(circle_at_30%_24%,rgba(255,255,255,0.12),rgba(20,15,12,0.92)_62%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="absolute inset-[5px] rounded-full border border-white/10" />
            <div className="absolute inset-0 rounded-full">
              {[...Array(8)].map((_, index) => {
                const angle = index * 45 - 90;
                const isMajor = index % 2 === 0;
                return (
                  <div
                    key={index}
                    className={`absolute left-1/2 top-1 origin-bottom ${
                      isMajor ? 'h-2.5 w-[2px] bg-[#f1d2bf]/85' : 'h-2 w-px bg-white/28'
                    }`}
                    style={{ transform: `rotate(${angle}deg) translateX(-50%) translateY(-7px)` }}
                  />
                );
              })}
            </div>

            <span className="absolute top-[6px] text-[10px] font-semibold tracking-[0.18em] text-[#f1d2bf]">N</span>
            <span className="absolute bottom-[6px] text-[9px] font-semibold tracking-[0.14em] text-white/68">S</span>
            <span className="absolute right-[7px] text-[9px] font-semibold tracking-[0.14em] text-white/68">E</span>
            <span className="absolute left-[7px] text-[9px] font-semibold tracking-[0.14em] text-white/68">W</span>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative transition-transform duration-150 ease-out" style={{ transform: `rotate(${rotation}deg)` }}>
                <div className="h-6 w-[2px] rounded-sm bg-gradient-to-t from-[#cc5a28] to-[#f1d2bf] shadow-[0_0_10px_rgba(204,90,40,0.6)]" />
                <div className="absolute -top-[5px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[4px] border-b-[8px] border-transparent border-b-[#cc5a28]" />
                <div className="absolute -bottom-2 left-1/2 h-3 w-[2px] -translate-x-1/2 rounded-sm bg-white/64" />
              </div>
            </div>

            <div className="absolute h-2.5 w-2.5 rounded-full border border-white/20 bg-white/86 shadow-[0_0_10px_rgba(255,255,255,0.18)]" />
          </div>

          <div className="flex min-w-[5.25rem] flex-col items-start">
            <div className="flex items-center gap-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[#f1d2bf]/48">Compass</p>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/58">
                {mode === 'three' ? '3D' : 'Map'}
              </span>
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-[1.15rem] font-semibold tracking-[-0.05em] text-white">{headingDegrees.toFixed(0)}&deg;</span>
              <span className="pb-0.5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#f1d2bf]">{headingCardinal}</span>
            </div>
            <div className="mt-2 h-px w-full bg-white/10" />
            <p className="mt-2 text-[10px] font-medium tracking-[0.18em] text-white/64">
              {mode === 'three' ? 'Orbit heading' : 'Deck heading'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
