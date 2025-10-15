'use client';

import { useEffect, useRef, useState } from 'react';
import { useCesium } from '@/contexts/cesium-context';

const TerrainClippingViewer = () => {
    const { viewer, ready } = useCesium();
    const Cesium = (window as any).Cesium as typeof import('cesium');
    const [edgeColor, setEdgeColor] = useState(Cesium.Color.WHITE);
    const [edgeWidth, setEdgeWidth] = useState(0.0);

    useEffect(() => {
        if (!ready || !viewer) return;

        let isMounted = true;

        const setupScene = async () => {
            try {
                // Create clipping planes
                const clippingPlanes = new Cesium.ClippingPlaneCollection({
                    planes: [
                        new Cesium.ClippingPlane(
                            new Cesium.Cartesian3(0.0, 0.0, -1.0),
                            0.0
                        ),
                    ],
                    edgeWidth: edgeWidth,
                    edgeColor: edgeColor,
                });

                viewer.scene.globe.clippingPlanes = clippingPlanes;
                viewer.scene.requestRender();

                // Load drillhole data
                const drillholeDataSource = await Cesium.GeoJsonDataSource.load('/assay_data.geojson');
                viewer.dataSources.add(drillholeDataSource);
                viewer.scene.requestRender();

                // Load block model
                const kmzDataSource = await Cesium.KmlDataSource.load('/tanga_boundary.kmz');
                const blockModelEntity = kmzDataSource.entities.values.find((entity: any) => entity.tileset);

                if (!blockModelEntity || !blockModelEntity.tileset) {
                    console.error("No tileset found in the KMZ file.");
                    return;
                }
                const blockModelTileset = blockModelEntity.tileset;
                blockModelTileset.clippingPlanes = clippingPlanes;
                viewer.scene.primitives.add(blockModelTileset);
                viewer.scene.requestRender();

                // Create a plane to visualize the clipping plane
                const planeEntity = viewer.entities.add({
                    position: clippingPlanes.modelMatrix.translation,
                    plane: {
                        dimensions: new Cesium.Cartesian2(300.0, 300.0),
                        material: Cesium.Color.WHITE.withAlpha(0.1),
                        plane: new Cesium.CallbackProperty(() => clippingPlanes.get(0).normal, false),
                        outline: true,
                        outlineColor: Cesium.Color.WHITE,
                    },
                });
                viewer.scene.requestRender();

                // Fly to the data
                viewer.flyTo(drillholeDataSource);

            } catch (error) {
                console.error("Error in TerrainClippingViewer:", error);
            }
        };

        setupScene();

        return () => {
            isMounted = false;
            if (viewer && !viewer.isDestroyed()) {
                viewer.scene.globe.clippingPlanes.enabled = false;
                viewer.scene.globe.clippingPlanes.removeAll();
                viewer.dataSources.removeAll();
                viewer.entities.removeAll();
            }
        };
    }, [ready, viewer, edgeColor, edgeWidth]);

    return (
        <div style={{ position: "absolute", top: "10px", left: "10px", zIndex: 1000, background: "rgba(42, 42, 42, 0.8)", padding: "10px", borderRadius: "5px" }}>
            <div style={{ marginBottom: "10px" }}>
                <label style={{ color: "white" }}>Edge Width</label>
                <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    value={edgeWidth}
                    onChange={(e) => setEdgeWidth(parseFloat(e.target.value))}
                />
            </div>
            <div>
                <label style={{ color: "white" }}>Edge Color</label>
                <select
                    onChange={(e) => {
                        const colorMap: { [key: string]: Cesium.Color } = {
                            WHITE: Cesium.Color.WHITE,
                            RED: Cesium.Color.RED,
                            GREEN: Cesium.Color.GREEN,
                            BLUE: Cesium.Color.BLUE,
                        };
                        setEdgeColor(colorMap[e.target.value.toUpperCase()] || Cesium.Color.WHITE);
                    }}
                >
                    <option>WHITE</option>
                    <option>RED</option>
                    <option>GREEN</option>
                    <option>BLUE</option>
                </select>
            </div>
        </div>
    );
};

export default TerrainClippingViewer;
