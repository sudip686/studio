'use client';

import React, { useEffect, ReactNode } from 'react';
import { useCesium } from '@/contexts/cesium-context';
import { useGeoScene } from '@/hooks/useGeoScene';
import { SubsurfaceProvider, useSubsurface } from '@/contexts/subsurface-context';
import ClippingManager from './ClippingManager';

/**
 * Internal component to bridge useGeoScene state to SubsurfaceContext
 */
function ThreeInitializer() {
    const { viewer, ready } = useCesium();
    const { setThree } = useSubsurface();
    const three = useGeoScene(ready ? viewer : null);

    useEffect(() => {
        if (three) {
            setThree(three);
        }
    }, [three, setThree]);

    return <ClippingManager />;
}

interface SubsurfaceViewerProps {
    children?: ReactNode;
    className?: string;
    initialState?: Partial<import('@/contexts/subsurface-context').SubsurfaceState>;
}

/**
 * Root container for subsurface visualization.
 * Provides context and initializes the Three.js overlay.
 */
export default function SubsurfaceViewer({ children, className, initialState }: SubsurfaceViewerProps) {
    return (
        <SubsurfaceProvider initialState={initialState}>
            <ThreeInitializer />
            <div className={className}>
                {children}
            </div>
        </SubsurfaceProvider>
    );
}
