'use client';

import { useEffect } from 'react';
import { ASSET_BASE_URL } from '@/lib/constants';

// Preload heavy scene assets (terrain, texture, boreholes) early to reduce wait times
export default function ScenePreloader() {
  useEffect(() => {
    try {
      // Kick off requests in parallel. Browser cache will serve subsequent fetches.
      // Note: If using R2, 'terrain_meta.json' might still be local, but height.bin definitely R2.
      // We assume everything large is on R2 if configured.
      const baseUrl = ASSET_BASE_URL;
      const urls: Array<{ url: string; opts?: RequestInit }> = [
        { url: '/terrain_meta.json', opts: { cache: 'force-cache' } }, // Usually kept local
        { url: `${baseUrl}/height.bin`, opts: { cache: 'force-cache' } },
        { url: '/drillholes_utm.json', opts: { cache: 'force-cache' } }, // Kept local (5MB)
      ];

      urls.forEach(({ url, opts }) => {
        fetch(url, opts).catch(() => {});
      });

      // Warm the terrain texture via Image so it's ready in GPU cache sooner
      const img = new Image();
      img.decoding = 'async';
      img.src = `${baseUrl}/terrain_texture_8k.jpg`; // Should match what TerrainAscLayer uses
      // No need to attach; browser will cache the image
    } catch {}
  }, []);

  return null;
}
