// src/app/chapters/resource-estimation/page.tsx
'use client';

import GeospatialLayout from '@/components/GeospatialLayout';
import ResourceEstimationClippingViewer from '@/components/viewers/ResourceEstimationClippingViewer';

export default function ResourceEstimationPage() {
  return (
    <GeospatialLayout>
      <ResourceEstimationClippingViewer />
    </GeospatialLayout>
  );
}
