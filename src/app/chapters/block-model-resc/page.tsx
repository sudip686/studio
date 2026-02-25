'use client';

import dynamic from 'next/dynamic';

const BlockModelRescViewer = dynamic(
  () => import('@/components/viewers/BlockModelRescView'),
  { ssr: false }
);

export default function BlockModelRescPage() {
  return <BlockModelRescViewer />;
}
