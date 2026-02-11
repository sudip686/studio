'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as THREE from 'three';
import { toFixed, orientationFrom } from '@/lib/boreholes/borehole-cylinders';
import { LITHOLOGY_COLOR_MAP } from '@/lib/boreholes/colors';

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
    grouped?: Record<string, any[]>; // Pre-grouped by color for fast rendering
}

interface ProcessedAssayData {
    byHoleId: Record<string, BoreholeInfo>;
    modelCenter: { lon: number; lat: number; };
    assayRange: { min: number; max: number; };
    grouped?: Record<string, any[]>; // Pre-grouped by color for fast rendering
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
    // Performance monitoring
    memoryUsage: number;
    dataSize: { lithology: number; assay: number; blockModel: number };
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
        memoryUsage: 0,
        dataSize: { lithology: 0, assay: 0, blockModel: 0 },
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

                // Parse lithology features
                const parsedLithologyFeatures: DrillholeSegment[] = (lithologyGeoJson.features || []).flatMap((f: any) => {
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

                // Parse assay features
                const parsedAssayFeatures: DrillholeSegment[] = (assayGeoJson.features || []).flatMap((f: any) => {
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

                const parsedDrillholes = [...parsedLithologyFeatures, ...parsedAssayFeatures];
                
                const parsedBlockModel: BlockSegment[] = blockModelGeoJson.features.map((f:any) => {
                    const p = f.properties ?? {};
                    const [lon, lat, elev] = f.geometry.coordinates;
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
                console.log('Parsed lithology features:', parsedLithologyFeatures);
                console.log('Parsed assay features:', parsedAssayFeatures);

                // Use lithology features as lithology data
                const lithologyData = parsedLithologyFeatures;
                console.log('Lithology data:', lithologyData);

                // Use assay features as assay data (not filtered by graphitic_carbon presence)
                const assayData = parsedAssayFeatures;
                console.log('Assay data:', assayData);

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
                        // Calculate length manually: |p1 - p0|
                        const dx = p1.x - p0.x;
                        const dy = p1.y - p0.y;
                        const dz = p1.z - p0.z;
                        const length = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
                        const { midpoint, quaternion } = orientationFrom(p0, p1);
                        borehole.orientation = { midpoint: new THREE.Vector3(midpoint.x, midpoint.y, midpoint.z), quaternion: new THREE.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w), length };
                    }
                });

                // Pre-group lithology by color for fast rendering
                const groupedLithology: Record<string, any[]> = {};
                Object.values(lithologyByHoleId).forEach(borehole => {
                    borehole.segments.forEach(segment => {
                        const lith = String(segment.lithology ?? 'UNKNOWN');
                        const css = LITHOLOGY_COLOR_MAP[lith] ?? LITHOLOGY_COLOR_MAP.UNKNOWN;
                        if (!groupedLithology[css]) {
                            groupedLithology[css] = [];
                        }
                        groupedLithology[css].push(segment);
                    });
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
                        // Calculate length manually: |p1 - p0|
                        const dx = p1.x - p0.x;
                        const dy = p1.y - p0.y;
                        const dz = p1.z - p0.z;
                        const length = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
                        const { midpoint, quaternion } = orientationFrom(p0, p1);
                        borehole.orientation = { midpoint: new THREE.Vector3(midpoint.x, midpoint.y, midpoint.z), quaternion: new THREE.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w), length };
                    }
                });

                // Pre-group assay by graphitic_carbon value for color mapping
                const groupedAssay: Record<string, any[]> = {};
                Object.values(assayByHoleId).forEach(borehole => {
                    borehole.segments.forEach(segment => {
                        const v = Number(segment.graphitic_carbon ?? 0);
                        const t = assayRange.max > assayRange.min ? (v - assayRange.min) / (assayRange.max - assayRange.min) : 0.5;
                        const colorKey = `assay_${t.toFixed(2)}`; // Group by normalized value
                        if (!groupedAssay[colorKey]) {
                            groupedAssay[colorKey] = [];
                        }
                        groupedAssay[colorKey].push({ ...segment, colorT: t });
                    });
                });

                // Calculate data sizes for performance monitoring
                const dataSizes = {
                    lithology: JSON.stringify(lithologyData).length,
                    assay: JSON.stringify(assayData).length,
                    blockModel: JSON.stringify(parsedBlockModel).length,
                };

                // Estimate memory usage (rough approximation)
                const memoryUsage = dataSizes.lithology + dataSizes.assay + dataSizes.blockModel +
                    JSON.stringify(lithologyByHoleId).length +
                    JSON.stringify(assayByHoleId).length +
                    JSON.stringify(groupedLithology).length +
                    JSON.stringify(groupedAssay).length;

                setCache({
                    drillholeData: {
                        lithology: lithologyData,
                        assay: assayData
                    },
                    blockModelData: parsedBlockModel,
                    processedLithologyData: {
                        byHoleId: lithologyByHoleId,
                        modelCenter: modelCenterLithology,
                        grouped: groupedLithology,
                    },
                    processedAssayData: {
                        byHoleId: assayByHoleId,
                        modelCenter: modelCenterAssay,
                        assayRange: assayRange,
                        grouped: groupedAssay,
                    },
                    loadingStatus: 'success',
                    error: null,
                    memoryUsage,
                    dataSize: dataSizes,
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