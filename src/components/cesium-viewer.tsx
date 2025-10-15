'use client';

import { useEffect, useRef, useState } from 'react';
import { useCesium } from '@/contexts/cesium-context';
import KmlBoundary from './KmlBoundary';
import IonImageryLayer from './IonImageryLayer';
import DrillholeLayer from './DrillholeLayer';
import Legend from '@/components/ui/legend';
import { cesiumViewerLithologyLegendData, mineralDomainsLegendData } from '@/lib/legend-definitions';

declare global {
    interface Window {
        Cesium: any;
        ko: any;
    }
}

type CesiumView = 'original' | 'exaggerated_kml' | 'styled_kml' | 'ion_imagery' | 'geojson_drillholes_lithology' | 'geojson_drillholes_assay' | 'tiff_overlay' | 'drillhole_3d_combined' | 'subsurface_deposit_view' | 'geospatial_viewer';

interface CesiumViewerProps {
    view: CesiumView;
}

interface DrillholeSegmentData {
    hole_id: string;
    x: number; 
    y: number; 
    z: number; 
    depth_from: number;
    depth_to: number;
}

interface AssaySegment extends DrillholeSegmentData {
    graphitic_carbon: number;
}

const TooltipContent = ({ data }: { data: any }) => {
    if (!data || !data.content) return null;
    return (
        <div
            className="absolute bg-gray-800 text-white p-3 rounded-md shadow-lg text-xs pointer-events-none"
            style={{ top: data.top, left: data.left, transform: 'translate(15px, 15px)' }}
        >
            <p className="font-bold text-base mb-1">Hole ID: {data.content.hole_id}</p>
            <ul className="list-none space-y-1">
                <li><strong>Lat:</strong> {data.content.latitude?.toFixed(5)}</li>
                <li><strong>Lon:</strong> {data.content.longitude?.toFixed(5)}</li>
                <li><strong>Depth From:</strong> {data.content.depth_from?.toFixed(2)} m</li>
                <li><strong>Depth To:</strong> {data.content.depth_to?.toFixed(2)} m</li>
                {data.content.lithology && <li><strong>Lithology:</strong> {data.content.lithology}</li>}
                {data.content.graphitic_carbon !== undefined && (
                    <li><strong>Graphitic Carbon:</strong> {data.content.graphitic_carbon?.toFixed(3)} %</li>
                )}
            </ul>
        </div>
    );
};

const CesiumViewer = ({ view }: CesiumViewerProps) => {
    const { viewer, isLoaded } = useCesium();
    
    const eventHandlerRef = useRef<any>(null);

    const [assayRange, setAssayRange] = useState({ min: 0, max: 1 });
    const [tooltip, setTooltip] = useState<{ display: boolean, top: number, left: number, content: any }>({ display: false, top: 0, left: 0, content: null });
    const [showSubsurfaceAssayLegend, setShowSubsurfaceAssayLegend] = useState(false);
    const [showMineralDomainsLegend, setShowMineralDomainsLegend] = useState(false);
    const [showExaggerationToolbar, setShowExaggerationToolbar] = useState(false);

    // Effect for one-time setup
    useEffect(() => {
        if (!isLoaded || !viewer) return;
        const Cesium = window.Cesium;

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((movement: any) => {
            const pickedObject = viewer.scene.pick(movement.endPosition);
            if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.properties) {
                const entity = pickedObject.id;
                const properties = entity.properties.getValue(viewer.clock.currentTime);
                setTooltip({ display: true, top: movement.endPosition.y, left: movement.endPosition.x, content: properties });
            } else {
                setTooltip({ display: false, top: 0, left: 0, content: null });
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        eventHandlerRef.current = handler;

        // Configure ScreenSpaceCameraController immediately on load
        viewer.scene.screenSpaceCameraController.enableRotate = true;
        viewer.scene.screenSpaceCameraController.enableTranslate = true;
        viewer.scene.screenSpaceCameraController.enableZoom = true;
        viewer.scene.screenSpaceCameraController.enableTilt = true;
        viewer.scene.screenSpaceCameraController.enableLook = true;
        viewer.scene.screenSpaceCameraController.enableCollisionDetection = true;

        const toolbar = document.getElementById("cesium-toolbar");
        let subscription: any = null;

        if (toolbar) {
            let viewModel = Cesium.knockout.dataFor(toolbar);
            if (!viewModel) {
                viewModel = { exaggeration: 1.0 };
                Cesium.knockout.track(viewModel);
                Cesium.knockout.applyBindings(viewModel, toolbar);
            }
            
            const observable = Cesium.knockout.getObservable(viewModel, 'exaggeration');
            if (observable) {
                subscription = observable.subscribe(
                    (value: any) => { if (viewer) viewer.scene.verticalExaggeration = Number(value) }
                );
            }
        }

        return () => {
            if (subscription) {
                subscription.dispose();
            }
            if (viewer && !viewer.isDestroyed()) {
                if (eventHandlerRef.current) eventHandlerRef.current.destroy();
            }
        };
    }, [isLoaded, viewer]);

    // This effect acts as a "reset" button for the 3D scene. It runs
    // every time the view changes to ensure the viewer is in 3D mode.
    useEffect(() => {
        if (!isLoaded || !viewer) return;

        const Cesium = window.Cesium;

        // 1. Force the scene back into 3D mode. This is the most important fix.
        viewer.scene.mode = Cesium.SceneMode.SCENE3D;
        
        // 2. Reset the terrain and exaggeration, as other views might change them.
        viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
        viewer.scene.verticalExaggeration = 1.0;

        // 3. Hide UI elements that might have been shown by other views.
        setShowExaggerationToolbar(false); // Or manage this based on the view

        // 4. Re-enable all camera controls for 3D interaction.
        viewer.scene.screenSpaceCameraController.enableRotate = true;
        viewer.scene.screenSpaceCameraController.enableTranslate = true;
        viewer.scene.screenSpaceCameraController.enableZoom = true;
        viewer.scene.screenSpaceCameraController.enableTilt = true;
        viewer.scene.screenSpaceCameraController.enableLook = true;
        viewer.scene.screenSpaceCameraController.enableCollisionDetection = true;
        
    }, [view, isLoaded, viewer]); // It re-runs whenever the view changes!

    return (
        <div className="pointer-events-none">
            {viewer && (view === 'original' || view === 'exaggerated_kml') && <KmlBoundary viewer={viewer} />}
            {viewer && view === 'styled_kml' && <KmlBoundary viewer={viewer} styled={true} />}
            {viewer && view === 'ion_imagery' && <IonImageryLayer viewer={viewer} assetId={3678736} />}
            {viewer && view === 'tiff_overlay' && <IonImageryLayer viewer={viewer} assetId={3754092} />}
            {viewer && view === 'geojson_drillholes_lithology' && <DrillholeLayer viewer={viewer} type='lithology' />}
            {viewer && view === 'geojson_drillholes_assay' && <DrillholeLayer viewer={viewer} type='assay' />}

            { (view === 'geojson_drillholes_lithology') &&
                <Legend
                    title={cesiumViewerLithologyLegendData.title}
                    type="categorical"
                    items={cesiumViewerLithologyLegendData.items}
                    show={true}
                />
            }
            { (view === 'geojson_drillholes_assay') &&
                <Legend
                    title="Assay (Graphitic Carbon)"
                    type="gradient"
                    gradient="linear-gradient(to right, hsl(120, 100%, 50%), hsl(0, 100%, 50%))"
                    minLabel={assayRange.min.toFixed(2)}
                    maxLabel={assayRange.max.toFixed(2)}
                    show={true}
                />
            }
            { showSubsurfaceAssayLegend &&
                <Legend
                    title="Assay (Graphitic Carbon)"
                    type="gradient"
                    gradient="linear-gradient(to right, hsl(120, 100%, 50%), hsl(0, 100%, 50%))"
                    minLabel={assayRange.min.toFixed(2)}
                    maxLabel={assayRange.max.toFixed(2)}
                    show={true}
                />
            }
            { showMineralDomainsLegend &&
                <Legend
                    title={mineralDomainsLegendData.title}
                    type="categorical"
                    items={mineralDomainsLegendData.items}
                    show={true}
                />
            }
            {tooltip.display && <TooltipContent data={tooltip} />}
            <div id="cesium-toolbar" style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(42, 42, 42, 0.8)', padding: '4px', borderRadius: '4px', color: 'white', zIndex: 1000, display: showExaggerationToolbar ? 'block' : 'none' }} className="pointer-events-auto">
                <table>
                    <tbody>
                    <tr>
                        <td>Exaggeration</td>
                        <td><input type="range" min="1" max="10" step="0.1" data-bind="value: exaggeration, valueUpdate: 'input'" /></td>
                        <td><input type="text" size={5} data-bind="value: exaggeration" /></td>
                    </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CesiumViewer;