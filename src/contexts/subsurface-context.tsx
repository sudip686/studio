'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import * as THREE from 'three';

export interface SubsurfaceState {
    // Clipping
    clippingPlanes: any[] | null; // Using any for Cesium.ClippingPlane
    threeClippingPlanes: THREE.Plane[] | null;
    clippingMode: 'none' | 'box' | 'polygon';
    clippingCenter: [number, number] | null; // [lon, lat]
    clippingRadius: number;

    // Visualization
    selectedProperty: string;
    transparency: number;
    showBoreholes: boolean;
    showBlockModel: boolean;
    
    // Three.js instance state (from useGeoScene)
    three: {
        scene: THREE.Scene;
        camera: THREE.PerspectiveCamera;
        renderer: THREE.WebGLRenderer;
    } | null;
}

interface SubsurfaceContextType extends SubsurfaceState {
    setClippingPlanes: (planes: any[], threePlanes: THREE.Plane[]) => void;
    setClippingMode: (mode: 'none' | 'box' | 'polygon') => void;
    setClippingCenter: (center: [number, number] | null) => void;
    setClippingRadius: (radius: number) => void;
    setSelectedProperty: (prop: string) => void;
    setTransparency: (value: number) => void;
    setShowBoreholes: (show: boolean) => void;
    setShowBlockModel: (show: boolean) => void;
    setThree: (three: SubsurfaceState['three']) => void;
}

const SubsurfaceContext = createContext<SubsurfaceContextType | undefined>(undefined);

export const SubsurfaceProvider = ({ 
    children, 
    initialState 
}: { 
    children: ReactNode,
    initialState?: Partial<SubsurfaceState>
}) => {
    const [state, setState] = useState<SubsurfaceState>({
        clippingPlanes: null,
        threeClippingPlanes: null,
        clippingMode: 'none',
        clippingCenter: null,
        clippingRadius: 1000,
        selectedProperty: 'Kr, GRAPHITIC_CARBON in GM_Litho: GRSC',
        transparency: 1.0,
        showBoreholes: true,
        showBlockModel: true,
        three: null,
        ...initialState
    });

    const setClippingPlanes = useCallback((planes: any[], threePlanes: THREE.Plane[]) => 
        setState(prev => ({ ...prev, clippingPlanes: planes, threeClippingPlanes: threePlanes })), []);
    
    const setClippingMode = useCallback((mode: SubsurfaceState['clippingMode']) => 
        setState(prev => ({ ...prev, clippingMode: mode })), []);

    const setClippingCenter = useCallback((center: SubsurfaceState['clippingCenter']) => 
        setState(prev => ({ ...prev, clippingCenter: center })), []);

    const setClippingRadius = useCallback((radius: number) => 
        setState(prev => ({ ...prev, clippingRadius: radius })), []);

    const setSelectedProperty = useCallback((prop: string) => 
        setState(prev => ({ ...prev, selectedProperty: prop })), []);

    const setTransparency = useCallback((value: number) => 
        setState(prev => ({ ...prev, transparency: value })), []);

    const setShowBoreholes = useCallback((show: boolean) => 
        setState(prev => ({ ...prev, showBoreholes: show })), []);

    const setShowBlockModel = useCallback((show: boolean) => 
        setState(prev => ({ ...prev, showBlockModel: show })), []);

    const setThree = useCallback((three: SubsurfaceState['three']) => 
        setState(prev => ({ ...prev, three })), []);

    const value: SubsurfaceContextType = React.useMemo(() => ({
        ...state,
        setClippingPlanes,
        setClippingMode,
        setClippingCenter,
        setClippingRadius,
        setSelectedProperty,
        setTransparency,
        setShowBoreholes,
        setShowBlockModel,
        setThree,
    }), [state, setClippingPlanes, setClippingMode, setClippingCenter, setClippingRadius, setSelectedProperty, setTransparency, setShowBoreholes, setShowBlockModel, setThree]);

    return (
        <SubsurfaceContext.Provider value={value}>
            {children}
        </SubsurfaceContext.Provider>
    );
};

export const useSubsurface = () => {
    const context = useContext(SubsurfaceContext);
    if (context === undefined) {
        throw new Error('useSubsurface must be used within a SubsurfaceProvider');
    }
    return context;
};
