'use client';

import { useEffect } from 'react';

// Preload heavy scene assets (terrain, texture, boreholes) early to reduce wait times
export default function ScenePreloader() {
  useEffect(() => {
    try {
      // Kick off requests in parallel. Browser cache will serve subsequent fetches.
      const urls: Array<{ url: string; opts?: RequestInit }> = [
        { url: '/terrain_meta.json', opts: { cache: 'force-cache' } },
        { url: '/height.bin', opts: { cache: 'force-cache' } },
        { url: '/drillholes_utm.json', opts: { cache: 'force-cache' } },
      ];

      urls.forEach(({ url, opts }) => {
        fetch(url, opts).catch(() => {});
      });

      // Warm the terrain texture via Image so it's ready in GPU cache sooner
      const img = new Image();
      img.decoding = 'async';
      img.src = '/terrain_texture_8k.jpg';
      // No need to attach; browser will cache the image
    } catch {}
  }, []);

  return null;
}
