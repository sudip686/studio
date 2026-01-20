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
    <div className={`flex flex-col items-center gap-1 ${className || ''}`}>
      <div className="flex flex-col items-center gap-1 bg-black/50 rounded-lg px-3 py-2 backdrop-blur-sm border border-gray-500/30 shadow-lg transition-all duration-200 hover:shadow-xl">
        <div className="flex items-center gap-2">
          {/* Left tick */}
          <div className="w-0.5 h-3 bg-orange-500/80 transition-all duration-200" />
          {/* Scale bar */}
          <div
            className="h-1 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full shadow-sm transition-all duration-200"
            style={{ width: `${pixelWidth}px` }}
          />
          {/* Right tick */}
          <div className="w-0.5 h-3 bg-orange-500/80 transition-all duration-200" />
        </div>
        <span className="text-xs font-semibold text-gray-200 tracking-wide transition-all duration-200">{scaleLabel}</span>
      </div>
    </div>
  );
}
