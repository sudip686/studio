'use client';

import type {
  RuntimeQualityMode,
  RuntimeQualityProfile,
  RuntimeSceneMode,
} from '@/lib/performance/useAdaptiveQuality';

type PerformanceStatusProps = {
  fps: number | null;
  memoryMb: number | null;
  frameTimeMs: number | null;
  sampleCount: number;
  sceneMode: RuntimeSceneMode;
  qualityMode: RuntimeQualityMode;
  resolvedProfile: RuntimeQualityProfile;
  reason: string;
  experimentVariant: string;
  onQualityModeChange: (mode: RuntimeQualityMode) => void;
};

const QUALITY_MODES: RuntimeQualityMode[] = ['auto', 'performance', 'balanced', 'quality'];

const formatMetric = (label: string, value: string | number | null) =>
  `${label} ${value === null ? '--' : value}`;

export function PerformanceStatus({
  fps,
  memoryMb,
  frameTimeMs,
  sampleCount,
  sceneMode,
  qualityMode,
  resolvedProfile,
  reason,
  experimentVariant,
  onQualityModeChange,
}: PerformanceStatusProps) {
  const sceneLabel = sceneMode === 'none' ? 'Shell' : sceneMode === 'three' ? '3D' : 'Map';
  const stats = [
    formatMetric('FPS', fps),
    formatMetric('Frame', frameTimeMs === null ? null : `${frameTimeMs} ms`),
    formatMetric('Memory', memoryMb === null ? null : `${memoryMb} MB`),
  ];

  return (
    <div className="vrify-runtime" data-testid="runtime-monitor">
      <div className="vrify-runtime__meta">
        <span className="vrify-runtime__label">Runtime monitor</span>
        <span className="vrify-runtime__summary">
          {sceneLabel} scene · {resolvedProfile} profile · {experimentVariant} variant
        </span>
      </div>

      <div className="vrify-runtime__stats" aria-label="Runtime metrics">
        {stats.map((item) => (
          <span key={item} className="vrify-runtime__stat">
            {item}
          </span>
        ))}
        <span className="vrify-runtime__stat">
          Samples {sampleCount}
        </span>
      </div>

      <div className="vrify-runtime__actions" aria-label="Runtime quality controls">
        {QUALITY_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            className={`vrify-runtime__chip ${qualityMode === mode ? 'is-active' : ''}`}
            onClick={() => onQualityModeChange(mode)}
            aria-pressed={qualityMode === mode}
          >
            {mode}
          </button>
        ))}
      </div>

      <p className="vrify-runtime__note">
        Active reason: <strong>{reason}</strong>
      </p>
    </div>
  );
}
