'use client';

import { useMemo } from 'react';
import DrillholeLayer from '../DrillholeLayer';
import { Legend } from '@/components/ui/legend';
import { drillholeLocationMapLithologyLegendData } from '@/lib/constants';
import { OverlaySlot } from '@/ui/overlays';
import { useDataCache } from '@/lib/data-cache';

interface DrillholeViewProps {
    type: 'lithology' | 'assay';
}

const DrillholeView = ({ type }: DrillholeViewProps) => {
    const { processedAssayData, processedLithologyData } = useDataCache();
    const assayRange = processedAssayData?.assayRange ?? { min: 0, max: 1 };
    const assayGradient = useMemo(
        () => `linear-gradient(to right, hsl(120, 100%, 50%), hsl(60, 100%, 50%), hsl(0, 100%, 50%))`,
        []
    );
    const lithologyLegendItems = processedLithologyData?.legendItems ?? drillholeLocationMapLithologyLegendData.items;

    return (
        <>
            <DrillholeLayer type={type} />
            <OverlaySlot slot="bottom-left">
                {type === 'lithology' && (
                    <Legend
                        title="Lithology"
                        type="categorical"
                        items={lithologyLegendItems}
                        guidance="Colors correspond to lithology classes. Hover a drillhole segment to see the lithology name and interval details."
                        show={true}
                    />
                )}
                {type === 'assay' && (
                    <Legend
                        title="Assay (Graphitic Carbon)"
                        type="gradient"
                        gradient={assayGradient}
                        minLabel={assayRange.min.toFixed(2)}
                        maxLabel={assayRange.max.toFixed(2)}
                        guidance="Higher values trend toward red; lower values trend toward green. Hover a segment to see exact assay values and depth interval."
                        show={true}
                    />
                )}
            </OverlaySlot>
        </>
    );
};

export default DrillholeView;
