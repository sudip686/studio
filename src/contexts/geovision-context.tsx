'use client';
import { createContext, useContext } from 'react';
import type { Scene, PerspectiveCamera } from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Define the context type, it should match what's provided in CommonGeoVision
export interface GeoVisionContextType {
    isLoaded: boolean;
    scene: Scene | null;
    camera: PerspectiveCamera | null;
    controls: OrbitControls | null;
    project: (lon: number, lat: number) => { x: number; z: number };
    processedDrillholeData: any;
    filters: {
        assayFilterValue: number;
        lithologyFilter: string;
        blockTransparency: number;
    };
    setFilters: React.Dispatch<React.SetStateAction<any>>;
}

export const GeoVisionContext = createContext<GeoVisionContextType | null>(null);

export const useGeoVision = () => {
    const context = useContext(GeoVisionContext);
    if (!context) {
        throw new Error('useGeoVision must be used within a GeoVisionContext.Provider');
    }
    return context;
};