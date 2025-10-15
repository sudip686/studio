'use client';

import { createContext, useContext, useRef, useEffect, useState, ReactNode, useCallback } from 'react';

declare global {
    interface Window {
        Cesium: any;
    }
}

// 1. UPDATE THE CONTEXT SHAPE to include the setBasemap function
interface CesiumContextValue {
    viewer: any;
    isLoaded: boolean;
    setBasemap: (style: string) => void;
}

// 2. UPDATE THE DEFAULT CONTEXT VALUE
const CesiumContext = createContext<CesiumContextValue | null>(null);

export const CesiumProvider = ({ children }: { children: ReactNode }) => {
    const cesiumContainerRef = useRef<HTMLDivElement>(null);
    const [viewer, setViewer] = useState<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // 3. CREATE THE setBasemap FUNCTION
    // This function can now be called from any component that uses the useCesium hook
    const setBasemap = useCallback((style: string) => {
        if (!viewer) return;

        const key = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
        const layers = viewer.imageryLayers;

        // Remove all existing base layers
        for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers.get(i);
            if (!layer._isOverlay) layers.remove(layer, true);
        }

        const provider = new window.Cesium.UrlTemplateImageryProvider({
            url: `https://api.maptiler.com/maps/${style}/{z}/{x}/{y}.png?key=${key}`,
            credit: "© MapTiler © OpenStreetMap"
        });

        layers.addImageryProvider(provider, 0); // Add as the new base layer
    }, [viewer]); // This function depends on the viewer instance

    // 4. UPDATE THE INITIALIZATION useEffect
    useEffect(() => {
        // Use an async function inside useEffect to handle await
        const initializeViewer = async () => {
           if (cesiumContainerRef.current && !viewer && window.Cesium) {
        try {
            window.Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzMmJlZTgxYi0wMjE5LTRhYzAtYTM1ZS02NzE0MDYxMGQzODMiLCJpZCI6MzMxMTEyLCJpYXQiOjE3NTgxNzk2Njh9.oqTC-DWfZOq776pNzMR9eYnS3VA17n6y3jOcuoXkJqs'; // Your token

            const key = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
            
            // Await the terrain provider and catch potential errors
            const terrainProvider = await window.Cesium.CesiumTerrainProvider.fromUrl(
                `https://api.maptiler.com/tiles/terrain-quantized-mesh-v2/?key=${key}`,
                { requestVertexNormals: true }
            );

            const v = new window.Cesium.Viewer(cesiumContainerRef.current, {
                terrainProvider: terrainProvider,
                timeline: false,
                animation: false,
                // Your other viewer options...
            });

            // --- Scene Quality and Configuration ---

            // Prevents underground geometry from showing through the surface
            v.scene.globe.depthTestAgainstTerrain = true;

            // Enables lighting calculations based on the sun's position
            v.scene.globe.enableLighting = true;

            // Enhances the 3D effect of the terrain
            v.scene.verticalExaggeration = 1.5;

            // ADDED: Enable FXAA for anti-aliasing, which smooths jagged edges
            v.scene.postProcessStages.fxaa.enabled = true;

            setViewer(v);
            setIsLoaded(true);

        } catch (error) {
            // ADDED: Catch errors during initialization (e.g., bad API key for terrain)
            console.error("Failed to initialize the Cesium Viewer:", error);
            // Optionally, you could set an error state here to show a message in the UI
            }
        }
        };

        initializeViewer();

        return () => {
            if (viewer && !viewer.isDestroyed()) {
                viewer.destroy();
                setViewer(null);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Set a default basemap once the viewer is loaded
    useEffect(() => {
        if (isLoaded && viewer) {
            setBasemap('satellite');
        }
    }, [isLoaded, viewer, setBasemap]);

    return (
        // 5. ADD setBasemap TO THE PROVIDER'S VALUE
        <CesiumContext.Provider value={{ viewer, isLoaded, setBasemap }}>
            <div className="h-full w-full absolute top-0 left-0" ref={cesiumContainerRef} />
            <div className="absolute top-0 left-0 h-full w-full pointer-events-none">
                {children}
            </div>
        </CesiumContext.Provider>
    );
};

export const useCesium = () => {
    const context = useContext(CesiumContext);
    if (context === null) {
        throw new Error('useCesium must be used within a CesiumProvider');
    }
    return context;
};