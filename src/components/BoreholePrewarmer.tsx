'use client';

import { useEffect } from 'react';
import { useDataCache, DrillholeSegment } from '@/lib/data-cache';
import { hasCachedLithology, setLithologyCache } from '@/lib/boreholes/geometry-cache';
import { processInChunks } from '@/lib/utils';
import { LITHOLOGY_COLORS } from '@/lib/constants';
import { colorFromLegend } from '@/lib/boreholes/legend-color';

/**
 * A silent component that pre-calculates borehole geometries in the background.
 */
export function BoreholePrewarmer() {
    const { drillholeData } = useDataCache();

    useEffect(() => {
        const Cesium = (window as any).Cesium;
        if (!drillholeData || hasCachedLithology() || !Cesium) {
            return; // Don't run if data is not ready, cache is populated, or Cesium is not available
        }

        console.log('[BoreholePrewarmer] Starting pre-calculation...');

        const segments = drillholeData.lithology || [];

        const createInstance = async (segment: DrillholeSegment): Promise<any | null> => {
            const { feature, lithology } = segment;
            const coords = feature.geometry.coordinates;
            if (!coords || coords.length < 2) return null;

            const [lon0, lat0, z0] = coords[0];
            const [lon1, lat1, z1] = coords[1];

            const start = Cesium.Cartesian3.fromDegrees(lon0, lat0, z0);
            const end = Cesium.Cartesian3.fromDegrees(lon1, lat1, z1);
            const length = Cesium.Cartesian3.distance(start, end);

            if (length <= 0) return null;

            const color = colorFromLegend(LITHOLOGY_COLORS, String(lithology).trim().toLowerCase().replace(/\s+/g, ' '));

            const geometry = new Cesium.CylinderGeometry({
                length: length,
                topRadius: 8,
                bottomRadius: 8,
                slices: 6,
            });

            const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(start);
            const zVector = Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(end, start, new Cesium.Cartesian3()), new Cesium.Cartesian3());
            const yVector = Cesium.Cartesian3.normalize(Cesium.Cartesian3.cross(new Cesium.Cartesian3(0, 0, 1), zVector, new Cesium.Cartesian3()), new Cesium.Cartesian3());
            const xVector = Cesium.Cartesian3.normalize(Cesium.Cartesian3.cross(zVector, yVector, new Cesium.Cartesian3()), new Cesium.Cartesian3());

            const rotationMatrix = new Cesium.Matrix3();
            Cesium.Matrix3.setColumn(rotationMatrix, 0, xVector, rotationMatrix);
            Cesium.Matrix3.setColumn(rotationMatrix, 1, yVector, rotationMatrix);
            Cesium.Matrix3.setColumn(rotationMatrix, 2, zVector, rotationMatrix);
            
            const quaternion = Cesium.Quaternion.fromRotationMatrix(rotationMatrix);
            const translation = Cesium.Matrix4.getTranslation(modelMatrix, new Cesium.Cartesian3());
            const finalModelMatrix = Cesium.Matrix4.fromTranslationQuaternionRotationScale(
                translation,
                quaternion,
                new Cesium.Cartesian3(1, 1, 1),
                new Cesium.Matrix4()
            );

            return new Cesium.GeometryInstance({
                geometry: geometry,
                modelMatrix: finalModelMatrix,
                attributes: {
                    color: Cesium.ColorGeometryInstanceAttribute.fromColor(color),
                },
                id: `bh-${segment.hole_id}-${segment.depth_from}-${segment.depth_to}`,
            });
        };

        (async () => {
            const instances = await processInChunks(segments, createInstance, { chunkSize: 100 });
            const validInstances = instances.filter((inst: any) => inst !== null);
            setLithologyCache(validInstances);
            console.log('[BoreholePrewarmer] Pre-calculation complete.');
        })();

    }, [drillholeData]);

    return null; // This component renders nothing
}

