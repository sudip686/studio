import LithologyViewer from './viewers/LithologyView';
import AssayViewer from './viewers/AssayView';
import BlockModelCarbonViewer from './viewers/BlockModelCarbonView';
import BlockModelRescViewer from './viewers/BlockModelRescView';

export default function ThreeJsViewSwitch({ view, assayCutoff }: { view: string; assayCutoff?: number }) {
    switch (view) {
        case 'lithology_view':
            return <LithologyViewer key="lith" assayCutoff={assayCutoff} />;
        case 'assay_view':
            return <AssayViewer key="assay" assayCutoff={assayCutoff} />;
        case 'block_model_carbon_view':
            return <BlockModelCarbonViewer key="bm_c" assayCutoff={assayCutoff} />;
        case 'block_model_resc_view':
            return <BlockModelRescViewer key="bm_r" assayCutoff={assayCutoff} />;        default:
            return null;
    }
}