'use client';

import { Legend } from '@/components/ui/legend';
import { drillholeLocationMapLithologyLegendData } from '@/lib/constants';
import { useDataCache } from '@/lib/data-cache';
import { OverlaySlot } from '@/ui/overlays';

const LICENSE_AREA_ITEMS = [{ label: 'Project AOI', color: '#fbbf24' }];

const RESOURCE_CLASSIFICATION_ITEMS = [
  { label: 'Indicated', color: '#f59e0b' },
  { label: 'Inferred', color: '#10b981' },
];

type PresentationLegendOverlayProps = {
  slideId?: string;
  view?: string;
};

export function PresentationLegendOverlay({
  slideId,
  view,
}: PresentationLegendOverlayProps) {
  const { processedAssayData, processedLithologyData, blockModelData } = useDataCache();

  if (!slideId || !view) {
    return null;
  }

  const lithologyLegendItems =
    processedLithologyData?.legendItems?.length
      ? processedLithologyData.legendItems
      : drillholeLocationMapLithologyLegendData.items;

  const assayRange = processedAssayData?.assayRange ?? { min: 0, max: 1 };
  const carbonRange = blockModelData?.length
    ? blockModelData.reduce(
        (range, block) => {
          const value = Number(block['Kr, GRAPHITIC_CARBON in GM_Litho: GRSC']);
          if (!Number.isFinite(value)) return range;
          return {
            min: Math.min(range.min, value),
            max: Math.max(range.max, value),
          };
        },
        { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY }
      )
    : null;
  const resolvedCarbonRange =
    carbonRange && Number.isFinite(carbonRange.min) && Number.isFinite(carbonRange.max)
      ? carbonRange
      : assayRange;
  const assayGradient =
    'linear-gradient(to right, hsl(120, 100%, 50%), hsl(60, 100%, 50%), hsl(0, 100%, 50%))';
  const carbonGradient =
    'linear-gradient(to right, #17304a, #205375, #2b7a78, #78c07f, #f6d860, #f08a5d)';

  const legends: React.ReactNode[] = [];

  if (view === 'original' || view === 'styled_kml' || view === 'exaggerated_kml') {
    legends.push(
      <Legend
        key="license"
        title="License Areas"
        type="categorical"
        items={LICENSE_AREA_ITEMS}
        guidance="All licence polygons in the merged project boundary."
      />
    );
  }

  if (
    view === 'geojson_drillholes_lithology' ||
    view === 'drillhole_location_lithology' ||
    view === 'lithology_view'
  ) {
    legends.push(
      <Legend
        key="lithology"
        title="Dominant Lithology"
        type="categorical"
        items={lithologyLegendItems}
        guidance="Colors correspond to the lithology classes visible in the current slide."
      />
    );
  }

  if (
    view === 'geojson_drillholes_assay' ||
    view === 'drillhole_location_assay' ||
    view === 'assay_view'
  ) {
    legends.push(
      <Legend
        key="assay"
        title="Assay Value"
        type="gradient"
        gradient={assayGradient}
        minLabel={assayRange.min.toFixed(2)}
        maxLabel={assayRange.max.toFixed(2)}
        guidance="Higher values trend toward red; lower values trend toward green."
      />
    );
  }

  if (view === 'block_model_carbon_view') {
    legends.push(
      <Legend
        key="carbon-lithology"
        title="Lithology"
        type="categorical"
        items={lithologyLegendItems}
      />
    );
    legends.push(
      <Legend
        key="carbon-value"
        title="Carbon Value"
        type="gradient"
        gradient={carbonGradient}
        minLabel={resolvedCarbonRange.min.toFixed(2)}
        maxLabel={resolvedCarbonRange.max.toFixed(2)}
        guidance="Blocks are colored by graphitic carbon concentration from low to high."
      />
    );
  }

  if (view === 'block_model_resc_view') {
    legends.push(
      <Legend
        key="resc-lithology"
        title="Lithology"
        type="categorical"
        items={lithologyLegendItems}
      />
    );
    legends.push(
      <Legend
        key="classification"
        title="Classification"
        type="categorical"
        items={RESOURCE_CLASSIFICATION_ITEMS}
        guidance="Classification colors match the model: indicated blocks are amber and inferred blocks are green."
      />
    );
  }

  if (legends.length === 0) {
    return null;
  }

  return (
    <OverlaySlot slot="top-left" wrapperClassName="deck-legend-panel legend-panel">
      <div className="flex flex-col gap-3">{legends}</div>
    </OverlaySlot>
  );
}
