'use client';

import TerrainSurfaceLayer from '@/components/viewers/TerrainSurfaceLayer';
import { useDataCache } from '@/lib/data-cache';

export default function SharedThreeTerrain() {
  const { processedLithologyData, processedAssayData } = useDataCache();
  const modelCenter = processedLithologyData?.modelCenter ?? processedAssayData?.modelCenter;

  return (
    <TerrainSurfaceLayer
      verticalScale={1}
      modelCenter={modelCenter}
    />
  );
}
