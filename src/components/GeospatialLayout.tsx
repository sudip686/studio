'use client';

import CommonCesiumViewer from '@/components/common-cesium-viewer';

// This component provides the layout but conditionally renders the Cesium viewer.
const GeospatialLayout = ({ children, showCesium }: { children: React.ReactNode, showCesium?: boolean }) => {
    return (
        <>
            {/* The Viewer now renders conditionally, filling the background */}
            {showCesium && <CommonCesiumViewer />}
            
            {/* The page content is rendered as a sibling, layered on top */}
            {children}
        </>
    );
};

export default GeospatialLayout;