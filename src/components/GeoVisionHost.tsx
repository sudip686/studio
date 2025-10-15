'use client';

import { useState } from 'react';
import GeoVision, { GeoVisionDisplayMode } from './geo-vision';
import { GeoVisionContext } from '@/contexts/geovision-context';
import { useDataCache } from '@/lib/data-cache';

interface GeoVisionHostProps {
    displayMode: GeoVisionDisplayMode;
    processedDrillholeData: any;
}

const GeoVisionHost = ({ displayMode, processedDrillholeData }: GeoVisionHostProps) => {
    console.log('[GeoVisionHost] Rendering');
    console.log(`[GeoVisionHost] displayMode: ${displayMode}`);
    console.log(`[GeoVisionHost] processedDrillholeData available: ${!!processedDrillholeData}`);

    const { blockModelData, loadingStatus, error } = useDataCache();
    console.log(`[GeoVisionHost] useDataCache: loadingStatus=${loadingStatus}, blockModelData available=${!!blockModelData}, error=${error}`);

    const [filters, setFilters] = useState({
        lithology: 'All',
        assayFilterValue: 0,
        blockTransparency: 0.8
    });

    if (loadingStatus === 'loading' || !processedDrillholeData) {
        console.log('[GeoVisionHost] Showing loading screen');
        return <div className="h-full w-full flex items-center justify-center bg-gray-900 text-white">Loading 3D Data...</div>;
    }

    if (error) {
        return <div className="h-full w-full flex items-center justify-center bg-gray-900 text-red-500">Error: {error}</div>;
    }

    const contextValue = {
      processedDrillholeData,
      blockModelData,
      filters,
      setFilters,
      loadingStatus,
      error,
    };

    return (
        <GeoVisionContext.Provider value={contextValue}>
            <GeoVision displayMode={displayMode} />
        </GeoVisionContext.Provider>
    );
};

export default GeoVisionHost;
