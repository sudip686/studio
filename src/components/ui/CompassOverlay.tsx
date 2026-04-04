import { useEffect, useState } from 'react';

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

  const rotation = headingUnit === 'degrees' ? heading : (heading * 180) / Math.PI;
  const headingDegrees = ((rotation % 360) + 360) % 360;

  return (
    <div className={`flex flex-col items-center pointer-events-auto ${className || ''}`}>
      <div className="relative flex flex-col items-center gap-2 overflow-hidden rounded-[26px] border border-[#f1d2bf]/14 bg-[linear-gradient(180deg,rgba(22,15,11,0.94),rgba(11,9,8,0.8))] px-3 py-3 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(241,210,191,0.16),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(204,90,40,0.16),transparent_38%)]" />
        <div className="relative flex w-full items-center justify-between px-0.5">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[#f1d2bf]/48">Compass</p>
            <p className="mt-1 text-[11px] font-medium tracking-[0.2em] text-white/78">{mode === 'three' ? '3D View' : 'Deck View'}</p>
          </div>
          <div className="rounded-full border border-[#f1d2bf]/12 bg-white/[0.06] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/86">
            {headingDegrees.toFixed(0)}&deg;
          </div>
        </div>

        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-[#f1d2bf]/12 bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.12),rgba(22,15,11,0.88)_60%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="absolute inset-1 rounded-full border border-white/10" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/5 via-transparent to-black/30" />

          <div className="absolute inset-0 rounded-full">
            {[...Array(12)].map((_, index) => {
              const angle = index * 30 - 90;
              const isMajor = index % 3 === 0;
              return (
                <div
                  key={index}
                  className={`absolute left-1/2 top-1 origin-bottom ${
                    isMajor ? 'h-3 w-0.5 bg-[#f1d2bf] shadow-[0_0_10px_rgba(241,210,191,0.42)]' : 'h-2 w-px bg-white/34'
                  }`}
                  style={{ transform: `rotate(${angle}deg) translateX(-50%) translateY(-10px)` }}
                />
              );
            })}
          </div>

          <span className="absolute top-1 text-[11px] font-semibold tracking-[0.18em] text-[#f1d2bf]">N</span>
          <span className="absolute bottom-1 text-[10px] font-semibold tracking-[0.16em] text-white/74">S</span>
          <span className="absolute right-1 text-[10px] font-semibold tracking-[0.16em] text-white/74">E</span>
          <span className="absolute left-1 text-[10px] font-semibold tracking-[0.16em] text-white/74">W</span>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative transition-transform duration-150 ease-out" style={{ transform: `rotate(${rotation}deg)` }}>
              <div className="h-8 w-0.5 rounded-sm bg-gradient-to-t from-[#cc5a28] to-[#f1d2bf] shadow-[0_0_8px_rgba(204,90,40,0.85)]" />
              <div className="absolute -top-1 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[4px] border-b-[8px] border-transparent border-b-[#cc5a28]" />
              <div className="absolute -bottom-3 left-1/2 h-4 w-0.5 -translate-x-1/2 rounded-sm bg-white/72" />
            </div>
          </div>

          <div className="absolute h-2.5 w-2.5 rounded-full border border-white/30 bg-white/80 shadow" />
        </div>
      </div>
    </div>
  );
}
