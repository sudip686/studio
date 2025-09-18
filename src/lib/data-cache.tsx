'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ## Data Structures & Constants ##
export interface DrillholeSegment {
    lon: number; lat: number; elevation: number; depth_from: number; depth_to: number; hole_id: string;
    lithology?: string; graphitic_carbon?: number; feature: any;
}
export interface BlockSegment {
    lon: number; lat: number; elevation: number; Id: string; dX: number; dY: number; dZ: number;
    "Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"?: string | number; RescCalc?: string; feature: any;
}

interface DataCache {
    drillholeData: {
        lithology: DrillholeSegment[];
        assay: DrillholeSegment[];
    } | null;
    blockModelData: BlockSegment[] | null;
    loadingStatus: 'idle' | 'loading' | 'success' | 'error';
    error: string | null;
}

const DataCacheContext = createContext<DataCache | undefined>(undefined);

export const DataCacheProvider = ({ children }: { children: ReactNode }) => {
    const [cache, setCache] = useState<DataCache>({
        drillholeData: null,
        blockModelData: null,
        loadingStatus: 'idle', 
        error: null,
    });

    useEffect(() => {
        const loadData = async () => {
            setCache(c => ({ ...c, loadingStatus: 'loading' }));
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

                const parsedDrillholes: DrillholeSegment[] = [...lithologyGeoJson.features, ...assayGeoJson.features].flatMap((f: any) => {
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

                setCache({
                    drillholeData: {
                        lithology: parsedDrillholes.filter(d => d.lithology),
                        assay: parsedDrillholes.filter(d => d.graphitic_carbon !== undefined)
                    },
                    blockModelData: parsedBlockModel,
                    loadingStatus: 'success',
                    error: null,
                });

            } catch (error: any) {
                setCache(c => ({ ...c, loadingStatus: 'error', error: error.message }));
                console.error("Failed to load data for cache:", error);
            }
        };

        if (cache.loadingStatus === 'idle') {
            loadData();
        }
    }, [cache.loadingStatus]);

    return (
        <DataCacheContext.Provider value={cache}>
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
