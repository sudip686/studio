'use client';

import CommonGeoVision, { GeoVisionDisplayMode } from './common-geo-vision';

interface GeoVisionHostProps {
    displayMode: GeoVisionDisplayMode;
    processedDrillholeData: any;
}

const GeoVisionHost = ({ displayMode, processedDrillholeData }: GeoVisionHostProps) => {
    return (
        <CommonGeoVision displayMode={displayMode}>
            {/* Children content here */}
        </CommonGeoVision>
    );
};

export default GeoVisionHost;
