import { useState, useEffect } from 'react';

interface MetricScaleOverlayProps {
  mode?: 'cesium' | 'three';
  getMetersIn100px?: () => number;
  className?: string;
}

export function MetricScaleOverlay({ mode, getMetersIn100px, className }: MetricScaleOverlayProps) {
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

  // Calculate appropriate scale based on meters in 100px
  // We want a "nice" number (1, 2, 5 * 10^n) that fits well within roughly 100-150px
  const getNiceScale = (meters: number) => {
    const exponent = Math.floor(Math.log10(meters));
    const fraction = meters / Math.pow(10, exponent);
    let niceFraction;
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
    
    return niceFraction * Math.pow(10, exponent);
  };

  const scaleLength = getNiceScale(metersIn100px);
  const scaleLabel = scaleLength >= 1000 
    ? `${(scaleLength / 1000).toFixed(scaleLength % 1000 === 0 ? 0 : 1)}km` 
    : `${scaleLength}m`;

  // Calculate pixel width for the scale bar
  const pixelWidth = (scaleLength / metersIn100px) * 100;

  return (
    <div className={`flex flex-col items-center gap-1 pointer-events-auto ${className || ''}`}>
      <div className="relative flex flex-col items-center gap-2 bg-white/75 rounded-xl px-4 py-3 backdrop-blur-md border border-orange-400/30 shadow-[0_8px_24px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_32px_rgba(249,115,22,0.2)] transition-all duration-300">
        {/* Enhanced scale bar container */}
        <div className="flex items-center gap-2">
          {/* Left tick with glow */}
          <div className="w-1 h-4 bg-gradient-to-t from-orange-400 to-orange-300 rounded-sm shadow-lg" />
          {/* Scale bar with enhanced gradient */}
          <div
            className="h-2 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 rounded-full shadow-lg hover:shadow-[0_0_12px_rgba(249,115,22,0.6)]"
            style={{ width: `${pixelWidth}px` }}
          />
          {/* Right tick with glow */}
          <div className="w-1 h-4 bg-gradient-to-t from-orange-400 to-orange-300 rounded-sm shadow-lg" />
        </div>
        {/* Enhanced label */}
        <span className="text-sm font-bold text-gray-800 tracking-wide drop-shadow-sm">{scaleLabel}</span>

        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-orange-400/10 via-transparent to-orange-200/10 pointer-events-none" />
      </div>
    </div>
  );
}