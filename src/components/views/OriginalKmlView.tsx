'use client';

import { useEffect } from 'react';
import { useCesium } from '@/contexts/cesium-context';
import KmlBoundary from '../KmlBoundary';
import { fitViewerToDataSource } from '@/lib/utils/cesium-fit'; // Import the helper

const OriginalKmlView = () => {
  const { viewer } = useCesium();

// Removed redundant useEffect for camera flight, now handled in KmlBoundary.tsx

  return <KmlBoundary />;
};

export default OriginalKmlView;
