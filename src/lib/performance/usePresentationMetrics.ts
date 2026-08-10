'use client';

import { useEffect, useState } from 'react';

export type PresentationMetrics = {
  fps: number | null;
  frameTimeMs: number | null;
  memoryMb: number | null;
  deviceMemoryGb: number | null;
  hardwareConcurrency: number | null;
  sampleCount: number;
  updatedAt: number | null;
};

const DEFAULT_METRICS: PresentationMetrics = {
  fps: null,
  frameTimeMs: null,
  memoryMb: null,
  deviceMemoryGb: null,
  hardwareConcurrency: null,
  sampleCount: 0,
  updatedAt: null,
};

const isJsdomEnvironment = () =>
  typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);

export function usePresentationMetrics(active = true) {
  const [metrics, setMetrics] = useState<PresentationMetrics>(DEFAULT_METRICS);

  useEffect(() => {
    if (!active || typeof window === 'undefined' || isJsdomEnvironment()) {
      return;
    }

    let frameCount = 0;
    let rafId = 0;
    let lastSampleAt = performance.now();
    let lastFrameAt = lastSampleAt;
    let totalFrameTime = 0;
    let sampleCount = 0;

    const sample = (timestamp: number) => {
      frameCount += 1;
      totalFrameTime += timestamp - lastFrameAt;
      lastFrameAt = timestamp;

      const elapsed = timestamp - lastSampleAt;
      if (elapsed >= 1000) {
        sampleCount += 1;
        const fps = Math.round((frameCount * 1000) / elapsed);
        const averageFrameTime = totalFrameTime / Math.max(frameCount, 1);
        const memory = (performance as Performance & {
          memory?: { usedJSHeapSize?: number };
        }).memory?.usedJSHeapSize;
        const nav = navigator as Navigator & { deviceMemory?: number };

        setMetrics({
          fps,
          frameTimeMs: Number(averageFrameTime.toFixed(1)),
          memoryMb: typeof memory === 'number' ? Math.round(memory / (1024 * 1024)) : null,
          deviceMemoryGb: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
          hardwareConcurrency:
            typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null,
          sampleCount,
          updatedAt: Date.now(),
        });

        frameCount = 0;
        totalFrameTime = 0;
        lastSampleAt = timestamp;
      }

      rafId = window.requestAnimationFrame(sample);
    };

    rafId = window.requestAnimationFrame(sample);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [active]);

  return metrics;
}
