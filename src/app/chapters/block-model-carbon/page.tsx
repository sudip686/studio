'use client';

import dynamic from 'next/dynamic';

const BlockModelCarbonViewer = dynamic(
  () => import('@/components/viewers/BlockModelCarbonView'),
  { ssr: false }
);

export default function BlockModelCarbonPage() {
  return <BlockModelCarbonViewer />;
}
