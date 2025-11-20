'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as THREE from 'three';
import * as Cesium from 'cesium';
import { toFixed, orientationFrom } from '@/lib/boreholes/borehole-cylinders';

// ## Data Structures & Constants ##
export interface DrillholeSegment {
    lon: number; lat: number; elevation: number; depth_from: number; depth_to: number; hole_id: string;
    lithology?: string; graphitic_carbon?: number; feature: any;
}
export interface BlockSegment {
    lon: number; lat: number; elevation: number; Id: string; dX: number; dY: number; dZ: number;
    "Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"?: string | number; RescCalc?: string; feature: any;
}

interface BoreholeInfo {
    segments: DrillholeSegment[];
    orientation: { midpoint: THREE.Vector3; quaternion: THREE.Quaternion; length: number; } | null;
}

interface ProcessedLithologyData {
    byHoleId: Record<string, BoreholeInfo>;
    modelCenter: { lon: number; lat: number; };
}

interface ProcessedAssayData {
    byHoleId: Record<string, BoreholeInfo>;
    modelCenter: { lon: number; lat: number; };
    assayRange: { min: number; max: number; };
}

interface DataCache {
    drillholeData: {
        lithology: DrillholeSegment[];
        assay: DrillholeSegment[];
    } | null;
    blockModelData: BlockSegment[] | null;
    processedLithologyData: ProcessedLithologyData | null;
    processedAssayData: ProcessedAssayData | null;
    loadingStatus: 'idle' | 'loading' | 'success' | 'error';
    error: string | null;
}

const DataCacheContext = createContext<(DataCache & { refetch: () => void; }) | undefined>(undefined);

export const DataCacheProvider = ({ children }: { children: ReactNode }) => {
    const [cache, setCache] = useState<DataCache>({
        drillholeData: null,
        blockModelData: null,
        processedLithologyData: null,
        processedAssayData: null,
        loadingStatus: 'idle',
        error: null,
    });

    const refetch = () => {
        setCache(c => ({ ...c, loadingStatus: 'idle' }));
    };

    useEffect(() => {
        const loadData = async () => {
            setCache(c => ({ ...c, loadingStatus: 'loading', error: null }));
            try {
                const [lithologyResponse, assayResponse, blockModelResponse] = await Promise.all([
                    fetch('/lithology_data.geojson'),
                    fetch('/assay_data.geojson'),
                    fetch('/BlockModel.geojson')
                ]);

                if (!lithologyResponse.ok) throw new Error(`Failed to fetch lithology: ${lithologyResponse.statusText}`);
                if (!assayResponse.ok) throw new Error(`Failed to fetch assay: ${assayResponse.statusText}`);
                if (!blockModelResponse.ok) throw new Error(`Failed to fetch block model: ${blockModelResponse.statusText}`);

                const [lithologyGeoJson, assayGeoJson, blockModelGeoJson] = await Promise.all([
                    lithologyResponse.json(),
                    assayResponse.json(),
                    blockModelResponse.json()
                ]);

                const parsedDrillholes: DrillholeSegment[] = [...(lithologyGeoJson.features || []), ...(assayGeoJson.features || [])].flatMap((f: any) => {
                    const p = f.properties;
                    if (f.geometry.type !== 'LineString' || !f.geometry.coordinates || f.geometry.coordinates.length < 2) return [];
                    const [startCoords, endCoords] = f.geometry.coordinates;
                    if (!startCoords || startCoords.length < 3 || !endCoords || endCoords.length < 3) return [];
                    return [{
                        lon: startCoords[0], lat: startCoords[1], elevation: startCoords[2],
                        depth_from: p.depth_from, depth_to: p.depth_to, hole_id: p.hole_id,
                        lithology: p.lithology, graphitic_carbon: p.graphitic_carbon,
                        feature: f
                    }];
                });
                
                const parsedBlockModel: BlockSegment[] = blockModelGeoJson.features.map((f:any) => {
                    const p = f.properties ?? {};
                    const [lat, lon, elev] = f.geometry.coordinates;
                    return {
                        lon, lat, elevation: elev,
                        Id: String(p.Id ?? ''),
                        dX: Number(p.dX ?? 10), dY: Number(p.dY ?? 10), dZ: Number(p.dZ ?? 10),
                        "Kr, GRAPHITIC_CARBON in GM_Litho: GRSC": p["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"],
                        RescCalc: p.RescCalc,
                        feature: f
                    };
                });

                console.log('Parsed drillholes:', parsedDrillholes);

                const lithologyData = parsedDrillholes.filter(d => d.lithology);
                console.log('Lithology data:', lithologyData);

                const assayData = parsedDrillholes.filter(d => d.graphitic_carbon !== undefined);

                // Process Lithology Data
                const lithologyByHoleId: Record<string, BoreholeInfo> = {};
                const allLithologyPoints: { lon: number; lat: number; elevation: number; }[] = [];

                lithologyData.forEach(segment => {
                    if (!lithologyByHoleId[segment.hole_id]) {
                        lithologyByHoleId[segment.hole_id] = { segments: [], orientation: null };
                    }
                    lithologyByHoleId[segment.hole_id].segments.push(segment);
                    allLithologyPoints.push({ lon: segment.lon, lat: segment.lat, elevation: segment.elevation });
                });

                const centerLonLithology = allLithologyPoints.reduce((acc, p) => acc + p.lon, 0) / allLithologyPoints.length;
                const centerLatLithology = allLithologyPoints.reduce((acc, p) => acc + p.lat, 0) / allLithologyPoints.length;
                const modelCenterLithology = { lon: centerLonLithology, lat: centerLatLithology };

                // Calculate orientation for each lithology borehole
                Object.values(lithologyByHoleId).forEach(borehole => {
                    if (borehole.segments.length > 0) {
                        const firstSegment = borehole.segments[0];
                        const lastSegment = borehole.segments[borehole.segments.length - 1];

                        const p0 = toFixed([firstSegment.lat, firstSegment.lon, firstSegment.elevation]);
                        const p1 = toFixed([lastSegment.lat, lastSegment.lon, lastSegment.elevation]);
                        const length = Cesium.Cartesian3.distance(p0, p1) || 0.01;
                        const { midpoint, quaternion } = orientationFrom(p0, p1);
                        borehole.orientation = { midpoint: new THREE.Vector3(midpoint.x, midpoint.y, midpoint.z), quaternion: new THREE.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w), length };
                    }
                });

                // Process Assay Data
                const assayByHoleId: Record<string, BoreholeInfo> = {};
                const allAssayPoints: { lon: number; lat: number; elevation: number; }[] = [];

                assayData.forEach(segment => {
                    if (!assayByHoleId[segment.hole_id]) {
                        assayByHoleId[segment.hole_id] = { segments: [], orientation: null };
                    }
                    assayByHoleId[segment.hole_id].segments.push(segment);
                    allAssayPoints.push({ lon: segment.lon, lat: segment.lat, elevation: segment.elevation });
                });

                const centerLonAssay = allAssayPoints.reduce((acc, p) => acc + p.lon, 0) / allAssayPoints.length;
                const centerLatAssay = allAssayPoints.reduce((acc, p) => acc + p.lat, 0) / allAssayPoints.length;
                const modelCenterAssay = { lon: centerLonAssay, lat: centerLatAssay };

                const assayValues = assayData.map(d => d.graphitic_carbon).filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
                const assayRange = assayValues.length === 0 ? { min: 0, max: 1 } : { min: Math.min(...assayValues), max: Math.max(...assayValues) };

                // Calculate orientation for each assay borehole
                Object.values(assayByHoleId).forEach(borehole => {
                    if (borehole.segments.length > 0) {
                        const firstSegment = borehole.segments[0];
                        const lastSegment = borehole.segments[borehole.segments.length - 1];

                        const p0 = toFixed([firstSegment.lat, firstSegment.lon, firstSegment.elevation]);
                        const p1 = toFixed([lastSegment.lat, lastSegment.lon, lastSegment.elevation]);
                        const length = Cesium.Cartesian3.distance(p0, p1) || 0.01;
                        const { midpoint, quaternion } = orientationFrom(p0, p1);
                        borehole.orientation = { midpoint: new THREE.Vector3(midpoint.x, midpoint.y, midpoint.z), quaternion: new THREE.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w), length };
                    }
                });

                setCache({
                    drillholeData: {
                        lithology: lithologyData,
                        assay: assayData
                    },
                    blockModelData: parsedBlockModel,
                    processedLithologyData: {
                        byHoleId: lithologyByHoleId,
                        modelCenter: modelCenterLithology,
                    },
                    processedAssayData: {
                        byHoleId: assayByHoleId,
                        modelCenter: modelCenterAssay,
                        assayRange: assayRange,
                    },
                    loadingStatus: 'success',
                    error: null,
                });
                console.log('Processed Lithology Data:', lithologyByHoleId);
                console.log('Processed Assay Data:', assayByHoleId);

            } catch (error) {
                console.error("Failed to load data:", error);
                setCache(c => ({
                    ...c,
                    loadingStatus: 'error',
                    error: error instanceof Error ? error.message : String(error)
                }));
            }
        };

        if (cache.loadingStatus === 'idle') {
            loadData();
        }
    }, [cache.loadingStatus]);

    return (
        <DataCacheContext.Provider value={{...cache, refetch}}>
            {children}
        </DataCacheContext.Provider>
    );
};

export const useDataCache = () => {
    const context = useContext(DataCacheContext);
    if (context === undefined) {
        throw new Error('useDataCache must be used within a DataCacheProvider');
    }
    return context;
};