'use client';

import React from 'react';
import { OverlaySlot } from '@/ui/overlays';
import { useSubsurface } from '@/contexts/subsurface-context';

export default function ClippingControls() {
    const { 
        transparency, setTransparency,
        showBoreholes, setShowBoreholes,
        showBlockModel, setShowBlockModel,
        clippingMode, setClippingMode,
        clippingRadius, setClippingRadius
    } = useSubsurface();

    return (
        <OverlaySlot slot="top-left">
            <div className="pointer-events-auto bg-black/80 text-white p-4 rounded-lg backdrop-blur-sm w-64 space-y-4">
                <h3 className="font-bold text-sm">Subsurface Controls</h3>
                
                <div className="space-y-2">
                    <label className="flex flex-col text-xs">
                        <span className="mb-1">Transparency: {Math.round(transparency * 100)}%</span>
                        <input 
                            type="range" 
                            min="0" max="1" step="0.05" 
                            value={transparency}
                            onChange={(e) => setTransparency(parseFloat(e.target.value))}
                            className="w-full"
                            aria-label="Transparency"
                        />
                    </label>
                </div>

                <div className="space-y-2">
                    <label className="flex items-center space-x-2 text-xs cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={showBoreholes}
                            onChange={(e) => setShowBoreholes(e.target.checked)}
                            aria-label="Show Boreholes"
                        />
                        <span>Show Boreholes</span>
                    </label>

                    <label className="flex items-center space-x-2 text-xs cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={showBlockModel}
                            onChange={(e) => setShowBlockModel(e.target.checked)}
                            aria-label="Show Block Model"
                        />
                        <span>Show Block Model</span>
                    </label>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-600">
                    <label className="flex flex-col text-xs">
                        <span className="mb-1">Clipping Mode</span>
                        <select 
                            value={clippingMode}
                            onChange={(e) => setClippingMode(e.target.value as any)}
                            className="bg-gray-700 rounded p-1 text-xs"
                        >
                            <option value="none">None</option>
                            <option value="box">Box (Puck)</option>
                            <option value="polygon">Polygon (KMZ)</option>
                            <option value="elevation">Elevation (Vertical)</option>
                        </select>
                    </label>
                </div>

                {clippingMode === 'elevation' && (
                    <div className="space-y-2 pt-2 border-t border-gray-600">
                        <label className="flex flex-col text-xs">
                            <span className="mb-1">Clipping Height: {Math.round(clippingRadius)}m</span>
                            <input 
                                type="range" 
                                min="-500" max="500" step="10" 
                                value={clippingRadius}
                                onChange={(e) => setClippingRadius(parseFloat(e.target.value))}
                                className="w-full"
                            />
                        </label>
                    </div>
                )}
            </div>
        </OverlaySlot>
    );
}
