'use client';

import { useEffect, useRef } from 'react';
import { useCesium } from '@/contexts/cesium-context';
import { ASSET_BASE_URL } from '@/lib/constants';

interface BlockModelBoxCutterProps {
    colorMode: 'grade' | 'class';
}

const BlockModelBoxCutter = ({ colorMode }: BlockModelBoxCutterProps) => {
    const { viewer, ready } = useCesium();
    const blockModelDsRef = useRef<any>(null);
    const clippingPlanesRef = useRef<any>(null);
    const createdEntitiesRef = useRef<any[]>([]);

    useEffect(() => {
        if (!ready || !viewer || viewer.isDestroyed()) return;

        const Cesium = (window as any).Cesium;
        let isMounted = true;

        const setupScene = async () => {
            try {
                // Load the block model data, but don't show the default point entities
                const ds = await Cesium.GeoJsonDataSource.load(`${ASSET_BASE_URL}/BlockModel.geojson`);
                ds.show = false;
                blockModelDsRef.current = ds;
                await viewer.dataSources.add(ds);

                // Wait for entities to be created
                await new Promise<void>(resolve => setTimeout(resolve, 0));
                if (!isMounted || viewer.isDestroyed()) return;

                const entities = ds.entities.values;
                if (entities.length === 0) return;

                // Create a bounding sphere for the entire block model to center the clipping box
                const boundingSpheres = entities.map((e: any) => e.position.getValue(viewer.clock.currentTime)).map((p: any) => new Cesium.BoundingSphere(p, 1));
                const union = Cesium.BoundingSphere.fromBoundingSpheres(boundingSpheres);
                const center = union.center;
                const enu = Cesium.Transforms.eastNorthUpToFixedFrame(center);

                // Create the clipping planes for the box
                const boxDimensions = new Cesium.Cartesian3(union.radius * 2.5, union.radius * 2.5, union.radius * 2.5);
                const planes = new Cesium.ClippingPlaneCollection({
                    modelMatrix: enu,
                    planes: [
                        new Cesium.ClippingPlane(new Cesium.Cartesian3(1, 0, 0), -boxDimensions.x / 2),
                        new Cesium.ClippingPlane(new Cesium.Cartesian3(-1, 0, 0), -boxDimensions.x / 2),
                        new Cesium.ClippingPlane(new Cesium.Cartesian3(0, 1, 0), -boxDimensions.y / 2),
                        new Cesium.ClippingPlane(new Cesium.Cartesian3(0, -1, 0), -boxDimensions.y / 2),
                        new Cesium.ClippingPlane(new Cesium.Cartesian3(0, 0, 1), -boxDimensions.z / 2),
                        new Cesium.ClippingPlane(new Cesium.Cartesian3(0, 0, -1), -boxDimensions.z / 2),
                    ],
                    unionClippingRegions: false,
                    edgeWidth: 1.0,
                    edgeColor: Cesium.Color.WHITE,
                    enabled: true,
                });
                clippingPlanesRef.current = planes;
                viewer.scene.globe.clippingPlanes = planes;

                // Create a box entity for each block in the model
                for (const entity of entities) {
                    const props = entity.properties.getValue(viewer.clock.currentTime);
                    const position = entity.position.getValue(viewer.clock.currentTime);

                    let color = Cesium.Color.GRAY.withAlpha(0.5);
                    if (colorMode === 'grade') {
                        const grade = props["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"];
                        if (grade > 5) color = Cesium.Color.RED.withAlpha(0.5);
                        else if (grade > 2) color = Cesium.Color.ORANGE.withAlpha(0.5);
                        else if (grade > 0.5) color = Cesium.Color.YELLOW.withAlpha(0.5);
                        else if (grade > 0.3) color = Cesium.Color.GREEN.withAlpha(0.5);
                        else color = Cesium.Color.BLUE.withAlpha(0.5);
                    } else { // class
                        const rescCalc = props.RescCalc;
                        if (rescCalc === "Indicated") color = Cesium.Color.BLUE.withAlpha(0.5);
                        else if (rescCalc === "Measured") color = Cesium.Color.GREEN.withAlpha(0.5);
                        else if (rescCalc === "Inferred") color = Cesium.Color.YELLOW.withAlpha(0.5);
                    }

                    const boxEntity = viewer.entities.add({
                        position: position,
                        box: {
                            dimensions: new Cesium.Cartesian3(props.dX, props.dY, props.dZ),
                            material: color,
                            outline: false,
                        },
                        properties: props,
                    });
                    createdEntitiesRef.current.push(boxEntity);
                }

                await viewer.flyTo(createdEntitiesRef.current);

            } catch (error) {
                console.error("Error in BlockModelBoxCutter:", error);
            }
        };

        setupScene();

        return () => {
            isMounted = false;
            if (viewer && !viewer.isDestroyed()) {
                // Remove created box entities
                createdEntitiesRef.current.forEach(entity => viewer.entities.remove(entity));
                createdEntitiesRef.current = [];

                // Remove the data source
                if (blockModelDsRef.current) {
                    viewer.dataSources.remove(blockModelDsRef.current, true);
                    blockModelDsRef.current = null;
                }

                // Remove clipping planes
                if (viewer.scene.globe.clippingPlanes) {
                    viewer.scene.globe.clippingPlanes.enabled = false;
                    viewer.scene.globe.clippingPlanes.removeAll();
                    viewer.scene.globe.clippingPlanes = undefined as any;
                }
                viewer.scene.requestRender();
            }
        };
    }, [ready, viewer, colorMode]);

    return null;
};

export default BlockModelBoxCutter;
