import LithologyViewer from './viewers/LithologyView';
import AssayViewer from './viewers/AssayView';
import BlockModelCarbonViewer from './viewers/BlockModelCarbonView';
import BlockModelRescViewer from './viewers/BlockModelRescView';
import ImmersivePresentationViewer from './ImmersivePresentationViewer';

export default function ThreeJsViewSwitch({ view, assayCutoff }: { view: string; assayCutoff?: number }) {

    // Check for immersive presentation view
    if (view === 'immersive_presentation') {
        return <ImmersivePresentationViewer viewType="presentation" />;
    }

    return (
        <>
            {view === 'lithology_view' && <LithologyViewer key="lith" />}
            {view === 'assay_view' && <AssayViewer key="assay" assayCutoff={assayCutoff} />}
            {view === 'block_model_carbon_view' && <BlockModelCarbonViewer key="bm_c" assayCutoff={assayCutoff} />}
            {view === 'block_model_resc_view' && <BlockModelRescViewer key="bm_r" assayCutoff={assayCutoff} />}
        </>
    );
}