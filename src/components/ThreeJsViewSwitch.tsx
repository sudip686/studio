import dynamic from 'next/dynamic';

export type AssayRangeFilter = { min: number; max: number } | null;
export type ClassificationFilter = 'All' | 'Indicated' | 'Inferred';

const LithologyViewer = dynamic(() => import('./viewers/LithologyView'), {
    ssr: false,
    loading: () => null,
});

const AssayViewer = dynamic(() => import('./viewers/AssayView'), {
    ssr: false,
    loading: () => null,
});

const BlockModelCarbonViewer = dynamic(() => import('./viewers/BlockModelCarbonView'), {
    ssr: false,
    loading: () => null,
});

const BlockModelRescViewer = dynamic(() => import('./viewers/BlockModelRescView'), {
    ssr: false,
    loading: () => null,
});

export default function ThreeJsViewSwitch({
    view,
    assayFilterRange,
    classificationFilter,
    presentationMode = false,
    meshVisible = true,
    terrainOpacity = 1,
}: {
    view: string;
    assayFilterRange?: AssayRangeFilter;
    classificationFilter?: ClassificationFilter;
    presentationMode?: boolean;
    meshVisible?: boolean;
    terrainOpacity?: number;
}) {
    // Determine if we're on a presentation slide
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const isPresentationSlide = ['lithology', 'assay', 'carbon_model', 'classification'].some(id =>
      pathSegments.includes(id)
    );
    const enhancedPresentationMode = presentationMode || isPresentationSlide;

    return (
        <>
            {view === 'lithology_view' && (
                <LithologyViewer
                    key="lith"
                    presentationMode={enhancedPresentationMode}
                    meshVisible={meshVisible}
                    terrainOpacity={terrainOpacity}
                />
            )}
            {view === 'assay_view' && (
                <AssayViewer
                    key="assay"
                    assayFilterRange={assayFilterRange}
                    presentationMode={enhancedPresentationMode}
                    meshVisible={meshVisible}
                    terrainOpacity={terrainOpacity}
                />
            )}
            {view === 'block_model_carbon_view' && (
                <BlockModelCarbonViewer
                    key="bm_c"
                    assayFilterRange={assayFilterRange}
                    presentationMode={enhancedPresentationMode}
                    meshVisible={meshVisible}
                    terrainOpacity={terrainOpacity}
                />
            )}
            {view === 'block_model_resc_view' && (
                <BlockModelRescViewer
                    key="bm_r"
                    assayFilterRange={assayFilterRange}
                    classificationFilter={classificationFilter}
                    presentationMode={enhancedPresentationMode}
                    meshVisible={meshVisible}
                    terrainOpacity={terrainOpacity}
                />
            )}
        </>
    );
}
