'use client';

import { useEffect, useRef } from 'react';
import { useCesium } from '@/contexts/cesium-context';

const TerrainClippingPlanes = () => {
    const { viewer } = useCesium();
    const dataSourcesRef = useRef<any[]>([]);
    const kmzUrl = '/tanga_boundary.kmz';
    
    useEffect(() => {
        if (!viewer) return;

        const Cesium = (window as any).Cesium as typeof import('cesium');
        let isMounted = true;

        const setupScene = async () => {
            try {
                const ds = await Cesium.KmlDataSource.load(kmzUrl, { clampToGround: true });
                if (!isMounted || viewer.isDestroyed()) return;

                await viewer.dataSources.add(ds);
                dataSourcesRef.current.push(ds);

                await viewer.flyTo(ds);
                const rect = viewer.camera.computeViewRectangle();
                if (!rect) return;

                const centerCarto = Cesium.Rectangle.center(rect);
                const center = Cesium.Cartesian3.fromRadians(centerCarto.longitude, centerCarto.latitude, 0);
                const eastNorthUp = Cesium.Transforms.eastNorthUpToFixedFrame(center);

                const corners = [
                    Cesium.Cartesian3.fromRadians(rect.west, rect.north),
                    Cesium.Cartesian3.fromRadians(rect.east, rect.north),
                    Cesium.Cartesian3.fromRadians(rect.east, rect.south),
                    Cesium.Cartesian3.fromRadians(rect.west, rect.south),
                ].map(c => Cesium.Matrix4.multiplyByPoint(Cesium.Matrix4.inverseTransformation(eastNorthUp, new Cesium.Matrix4()), c, new Cesium.Cartesian3()));

                const xs = corners.map(c => c.x), ys = corners.map(c => c.y);
                const hx = (Math.max(...xs) - Math.min(...xs)) / 2;
                const hy = (Math.max(...ys) - Math.min(...ys)) / 2;
                const hz = Math.max(hx, hy) * 1.2; // tall box to slice terrain

                const planes = new Cesium.ClippingPlaneCollection({
                    modelMatrix: eastNorthUp,
                    planes: [
                        new Cesium.ClippingPlane(new Cesium.Cartesian3( 1, 0, 0), -hx),
                        new Cesium.ClippingPlane(new Cesium.Cartesian3(-1, 0, 0), -hx),
                        new Cesium.ClippingPlane(new Cesium.Cartesian3( 0, 1, 0), -hy),
                        new Cesium.ClippingPlane(new Cesium.Cartesian3( 0,-1, 0), -hy),
                        new Cesium.ClippingPlane(new Cesium.Cartesian3( 0, 0, 1), -hz),
                        new Cesium.ClippingPlane(new Cesium.Cartesian3( 0, 0,-1), -hz),
                    ],
                    unionClippingRegions: false,           // intersect (a true box)
                    edgeWidth: 1.0,
                    edgeColor: Cesium.Color.WHITE,
                    enabled: true,
                });

                const globe = viewer.scene.globe;
                const prevBackFace = globe.backFaceCulling;
                const prevSkirts = globe.showSkirts;

                globe.backFaceCulling = true;
                globe.showSkirts = true;
                globe.clippingPlanes = planes;

                // Cleanup restores globe flags & clipping
                return () => {
                    globe.clippingPlanes?.removeAll();
                    globe.clippingPlanes = undefined as any;
                    globe.backFaceCulling = prevBackFace;
                    globe.showSkirts = prevSkirts;
                };

            } catch (error) {
                console.error("Error in TerrainClippingPlanes:", error);
            }
        };

        let disposer: (() => void) | undefined;
        setupScene().then((d) => (disposer = d));

        return () => {
            isMounted = false;
            if (disposer) disposer();
            if (dataSourcesRef.current && viewer && !viewer.isDestroyed()) {
                dataSourcesRef.current.forEach((ds: any) => viewer.dataSources.remove(ds, true));
                dataSourcesRef.current = [];
            }
        };
    }, [viewer]);

    return null;
};

export default TerrainClippingPlanes;