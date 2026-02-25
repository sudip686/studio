import LithologyViewer from './viewers/LithologyView';
import AssayViewer from './viewers/AssayView';
import BlockModelCarbonViewer from './viewers/BlockModelCarbonView';
import BlockModelRescViewer from './viewers/BlockModelRescView';

export type AssayRangeFilter = { min: number; max: number } | null;

export default function ThreeJsViewSwitch({ view, assayFilterRange }: { view: string; assayFilterRange?: AssayRangeFilter }) {

    return (
        <>
            {view === 'lithology_view' && <LithologyViewer key="lith" />}
            {view === 'assay_view' && <AssayViewer key="assay" assayFilterRange={assayFilterRange} />}
            {view === 'block_model_carbon_view' && <BlockModelCarbonViewer key="bm_c" assayFilterRange={assayFilterRange} />}
            {view === 'block_model_resc_view' && <BlockModelRescViewer key="bm_r" assayFilterRange={assayFilterRange} />}
        </>
    );
}