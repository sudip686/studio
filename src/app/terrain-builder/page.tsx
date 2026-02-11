'use client';
import dynamic from 'next/dynamic';

// TerrainGlbBuilder uses Three/DOM APIs; ensure it renders on client only
const TerrainGlbBuilder = dynamic(() => import('@/components/tools/TerrainGlbBuilder'), { ssr: false });

export default function Page() {
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <TerrainGlbBuilder />
    </div>
  );
}
