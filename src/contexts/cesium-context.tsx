'use client';

import { createContext, useContext, useRef, useEffect, useState, ReactNode } from 'react';

declare global {
    interface Window {
        Cesium: any;
    }
}

interface CesiumContextValue {
    viewer: any;
    isLoaded: boolean;
}

const CesiumContext = createContext<CesiumContextValue | null>(null);

export const CesiumProvider = ({ children }: { children: ReactNode }) => {
    const cesiumContainerRef = useRef<HTMLDivElement>(null);
    const [viewer, setViewer] = useState<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (cesiumContainerRef.current && !viewer && window.Cesium) {
            window.Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzMmJlZTgxYi0wMjE5LTRhYzAtYTM1ZS02NzE0MDYxMGQzODMiLCJpZCI6MzMxMTEyLCJpYXQiOjE3NTgxNzk2Njh9.oqTC-DWfZOq776pNzMR9eYnS3VA17n6y3jOcuoXkJqs';
            const v = new window.Cesium.Viewer(cesiumContainerRef.current, {
                timeline: false,
                animation: false,
                geocoder: false,
                homeButton: false,
                sceneModePicker: false,
                baseLayerPicker: false,
                navigationHelpButton: false,
                infoBox: false,
                selectionIndicator: false,
                shadows: false,
            });
            
            v.imageryLayers.addImageryProvider(
                new window.Cesium.UrlTemplateImageryProvider({
                    url: `https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=MQ8jhB5F57QiT1CrsiUJ`,
                })
            );

            setViewer(v);
            setIsLoaded(true);
        }

        return () => {
            if (viewer && !viewer.isDestroyed()) {
                viewer.destroy();
                setViewer(null);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <CesiumContext.Provider value={{ viewer, isLoaded }}>
            <div className="h-full w-full absolute top-0 left-0 -z-10" ref={cesiumContainerRef} />
            {children}
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
