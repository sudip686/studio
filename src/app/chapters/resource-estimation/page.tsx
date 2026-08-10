// src/app/chapters/resource-estimation/page.tsx
'use client';

import GeospatialLayout from '@/components/GeospatialLayout';
import SubsurfaceViewer from '@/components/viewers/SubsurfaceViewer';
import BlockModelLayer from '@/components/viewers/BlockModelLayer';
import ClippingControls from '@/components/viewers/ClippingControls';

export default function ResourceEstimationPage() {
  return (
    <GeospatialLayout showCesium={true}>
      <SubsurfaceViewer
        initialState={{ clippingMode: 'none', transparency: 0.68 }}
        showSceneHud
        hudTitle="Resource estimation"
        hudSubtitle="Terrain, classification blocks, and optional clipping controls."
      >
        <BlockModelLayer colorMode="classification" />
        <ClippingControls />
      </SubsurfaceViewer>
    </GeospatialLayout>
  );
}

