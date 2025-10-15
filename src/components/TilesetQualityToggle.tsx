'use client';
import { useCesium } from '@/contexts/cesium-context';

export default function TilesetQualityToggle() {
  const { tileset, applyTilesetProfile } = useCesium();
  if (!tileset || !applyTilesetProfile) return null;

  const setProfile = (p: 'performance'|'balanced'|'quality') => {
    applyTilesetProfile(tileset, p);
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] bg-black/60 text-white rounded-xl px-3 py-2 pointer-events-auto space-x-2">
      <button onClick={() => setProfile('performance')}>Performance</button>
      <button onClick={() => setProfile('balanced')}>Balanced</button>
      <button onClick={() => setProfile('quality')}>Quality</button>
    </div>
  );
}