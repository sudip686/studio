'use client';

import { useEffect, useRef } from 'react';
import { useDataCache } from '@/lib/data-cache';
import { buildBlockModelCenter, prewarmTerrainSurface } from '@/lib/terrain/shared-terrain-cache';

// Preload heavy scene assets (terrain, texture, boreholes) early to reduce wait times
export default function ScenePreloader() {
  const { processedLithologyData, processedAssayData, blockModelData } = useDataCache();
  const warmedTerrainKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const warmFirstAvailable = (candidates: string[], opts?: RequestInit) => {
        const tryNext = (index: number) => {
          if (index >= candidates.length) return;
          fetch(candidates[index], opts)
            .then((response) => {
              if (!response.ok) {
                tryNext(index + 1);
              }
            })
            .catch(() => tryNext(index + 1));
        };
        tryNext(0);
      };

      const criticalUrls: Array<{ candidates: string[]; opts?: RequestInit }> = [
        {
          candidates: ['/terrain_meta.json'],
          opts: { cache: 'force-cache' },
        },
        {
          candidates: ['/terrain_runtime.json'],
          opts: { cache: 'force-cache' },
        },
      ];

      criticalUrls.forEach(({ candidates, opts }) => {
        warmFirstAvailable(candidates, opts);
      });

      const idleWarm = () => {
        const deferredUrls: Array<{ candidates: string[]; opts?: RequestInit }> = [
          {
            candidates: ['/api/lithology-data'],
            opts: { cache: 'no-store' },
          },
          {
            candidates: ['/api/assay-data'],
            opts: { cache: 'no-store' },
          },
        ];

        deferredUrls.forEach(({ candidates, opts }) => {
          warmFirstAvailable(candidates, opts);
        });

        // Prioritize high-res 8K texture for presentation slides (lithology, assay, carbon_model, classification)
        const isPresentationSlide = typeof window !== 'undefined'
          ? window.location.pathname
              ?.split('/')
              .some((segment) => ['lithology', 'assay', 'carbon_model', 'classification'].includes(segment))
          : false;
        const textureCandidates = [
          ...(isPresentationSlide ? ['/terrain_texture_8k.jpg', '/texture_rgb_8192.png'] : ['/texture_rgb_8192.png', '/terrain_texture_8k.jpg']),
        ];

        textureCandidates.forEach((src) => {
          const img = new Image();
          img.decoding = 'async';
          img.src = src;
        });
      };

      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(idleWarm);
      } else {
        setTimeout(idleWarm, 1200);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const centers = [
      processedLithologyData?.modelCenter ?? processedAssayData?.modelCenter ?? null,
      buildBlockModelCenter(blockModelData),
    ].filter((value): value is { lon: number; lat: number } => Boolean(value));

    if (centers.length === 0) return;

    const scheduleWarm = (callback: () => void) => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(callback);
      } else {
        setTimeout(callback, 300);
      }
    };

    centers.forEach((center) => {
      const key = `${center.lon.toFixed(6)}_${center.lat.toFixed(6)}`;
      if (warmedTerrainKeysRef.current.has(key)) return;
      warmedTerrainKeysRef.current.add(key);

      scheduleWarm(() => {
        prewarmTerrainSurface(center).catch((error) => {
          console.warn('[ScenePreloader] Terrain prewarm failed:', error);
        });
      });
    });
  }, [blockModelData, processedAssayData?.modelCenter, processedLithologyData?.modelCenter]);

  return null;
}
