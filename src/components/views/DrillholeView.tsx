'use client';

import { useState } from 'react';
import DrillholeLayer from '../DrillholeLayer';
import { Legend } from '@/components/ui/legend';
import { cesiumViewerLithologyLegendData } from '@/lib/constants';

interface DrillholeViewProps {
    type: 'lithology' | 'assay';
}

const DrillholeView = ({ type }: DrillholeViewProps) => {
    // The assay range state was in CesiumViewer, it's needed for the legend.
    // For now, a placeholder is used. This might need to be lifted up
    // or fetched within this component if the data is available here.
    const [assayRange, setAssayRange] = useState({ min: 0, max: 1 });

    return (
        <>
            <DrillholeLayer type={type} />
            {type === 'lithology' &&
                <Legend
                    title={cesiumViewerLithologyLegendData.title}
                    type="categorical"
                    items={cesiumViewerLithologyLegendData.items}
                    show={true}
                />
            }
            {type === 'assay' &&
                <Legend
                    title="Assay (Graphitic Carbon)"
                    type="gradient"
                    gradient="linear-gradient(to right, hsl(120, 100%, 50%), hsl(0, 100%, 50%))"
                    minLabel={assayRange.min.toFixed(2)}
                    maxLabel={assayRange.max.toFixed(2)}
                    show={true}
                />
            }
        </>
    );
};

export default DrillholeView;
