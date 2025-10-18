'use client';

import { CesiumProvider } from '@/contexts/cesium-context';
import DrillholeLayer from '@/components/DrillholeLayer';

// This component provides the layout and conditionally renders the Cesium viewer with data layers.
const GeospatialLayout = ({ 
    children, 
    showCesium,
    showDrillholes 
}: { 
    children: React.ReactNode, 
    showCesium?: boolean,
    showDrillholes?: 'lithology' | 'assay'
}) => {
    // If the page using this layout doesn't want a Cesium view, just render the children.
    if (!showCesium) {
        return <>{children}</>;
    }

    // Otherwise, render the Cesium provider, which creates the globe.
    // Then, render the DrillholeLayer and any page content as children on top.
    return (
        <CesiumProvider>
            {/* If a drillhole type is specified, render the layer */}
            {showDrillholes && <DrillholeLayer type={showDrillholes} />}
            
            {/* The page content is rendered as a child, layered on top */}
            {children}
        </CesiumProvider>
    );
};

export default GeospatialLayout;
