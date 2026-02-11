// src/app/chapters/resource-estimation/page.tsx
'use client';

import GeospatialLayout from '@/components/GeospatialLayout';
import SubsurfaceViewer from '@/components/viewers/SubsurfaceViewer';
import BlockModelLayer from '@/components/viewers/BlockModelLayer';
import ClippingControls from '@/components/viewers/ClippingControls';

export default function ResourceEstimationPage() {
  return (
    <GeospatialLayout showCesium={true}>
      <SubsurfaceViewer initialState={{ clippingMode: 'elevation', transparency: 0.8 }}>
        <BlockModelLayer colorMode="classification" />
        <ClippingControls />
      </SubsurfaceViewer>
    </GeospatialLayout>
  );
}
