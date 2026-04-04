import { useEffect, useState } from 'react';

interface MetricScaleOverlayProps {
  mode?: 'cesium' | 'three';
  getMetersIn100px?: () => number;
  className?: string;
}

export function MetricScaleOverlay({ getMetersIn100px, className }: MetricScaleOverlayProps) {
  const [metersIn100px, setMetersIn100px] = useState(100);

  useEffect(() => {
    if (!getMetersIn100px) {
      setMetersIn100px(100);
      return;
    }

    let animationFrameId: number;

    const update = () => {
      setMetersIn100px(getMetersIn100px());
      animationFrameId = requestAnimationFrame(update);
    };

    update();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [getMetersIn100px]);

  const getNiceScale = (meters: number) => {
    if (!Number.isFinite(meters) || meters <= 0) return 100;
    const exponent = Math.floor(Math.log10(meters));
    const fraction = meters / Math.pow(10, exponent);
    let niceFraction = 10;
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    return niceFraction * Math.pow(10, exponent);
  };

  const scaleLength = getNiceScale(metersIn100px);
  const scaleLabel =
    scaleLength >= 1000
      ? `${(scaleLength / 1000).toFixed(scaleLength % 1000 === 0 ? 0 : 1)} km`
      : `${scaleLength} m`;
  const pixelWidth = Math.max(52, Math.min(132, (scaleLength / metersIn100px) * 100));

  return (
    <div className={`flex flex-col items-center gap-1 pointer-events-auto ${className || ''}`}>
      <div className="relative overflow-hidden rounded-[22px] border border-[#f1d2bf]/14 bg-[linear-gradient(180deg,rgba(22,15,11,0.94),rgba(11,9,8,0.8))] px-4 py-3 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl transition-all duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(241,210,191,0.14),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(204,90,40,0.12),transparent_38%)]" />
        <div className="relative flex flex-col items-center gap-2">
          <div className="flex w-full items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[#f1d2bf]/48">Scale</span>
            <span className="rounded-full border border-[#f1d2bf]/12 bg-white/[0.06] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/84">
              Live
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-sm bg-gradient-to-t from-[#cc5a28] to-[#f1d2bf] shadow-[0_0_10px_rgba(204,90,40,0.45)]" />
            <div
              className="h-2 rounded-full border border-[#f1d2bf]/12 bg-gradient-to-r from-[#f1d2bf] via-[#cc5a28] to-[#f1d2bf] shadow-[0_0_14px_rgba(204,90,40,0.26)]"
              style={{ width: `${pixelWidth}px` }}
            />
            <div className="h-4 w-1 rounded-sm bg-gradient-to-t from-[#cc5a28] to-[#f1d2bf] shadow-[0_0_10px_rgba(204,90,40,0.45)]" />
          </div>
          <div className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-white/82">
            <span>0</span>
            <span>{scaleLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
