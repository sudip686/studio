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
  let scaleLength = 100; // meters
  let scaleLabel = '100m';

  if (metersIn100px < 10) {
    scaleLength = Math.round(metersIn100px * 10);
    scaleLabel = `${scaleLength}m`;
  } else if (metersIn100px < 100) {
    scaleLength = Math.round(metersIn100px);
    scaleLabel = `${scaleLength}m`;
  } else if (metersIn100px < 1000) {
    scaleLength = Math.round(metersIn100px / 10) * 10;
    scaleLabel = `${scaleLength}m`;
  } else {
    scaleLength = Math.round(metersIn100px / 100) * 100;
    scaleLabel = `${scaleLength}m`;
  }

  // Calculate pixel width for the scale bar (assuming 100px represents metersIn100px meters)
  const pixelWidth = (scaleLength / metersIn100px) * 100;

  return (
    <div className={`flex flex-col items-center gap-1 pointer-events-auto ${className || ''}`}>
      <div className="relative flex flex-col items-center gap-2 bg-gradient-to-br from-black/60 via-black/50 to-black/40 rounded-xl px-4 py-3 backdrop-blur-md border border-orange-400/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_48px_rgba(249,115,22,0.2)] transition-all duration-300">
        {/* Enhanced scale bar container */}
        <div className="flex items-center gap-2">
          {/* Left tick with glow */}
          <div className="w-1 h-4 bg-gradient-to-t from-orange-400 to-orange-300 rounded-sm shadow-lg transition-all duration-300" />
          {/* Scale bar with enhanced gradient */}
          <div
            className="h-2 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 rounded-full shadow-lg transition-all duration-300 hover:shadow-[0_0_12px_rgba(249,115,22,0.6)]"
            style={{ width: `${pixelWidth}px` }}
          />
          {/* Right tick with glow */}
          <div className="w-1 h-4 bg-gradient-to-t from-orange-400 to-orange-300 rounded-sm shadow-lg transition-all duration-300" />
        </div>
        {/* Enhanced label */}
        <span className="text-sm font-bold text-white tracking-wide drop-shadow-lg transition-all duration-300">{scaleLabel}</span>

        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-orange-400/5 via-transparent to-gray-400/5 pointer-events-none" />
      </div>
    </div>
  );
}