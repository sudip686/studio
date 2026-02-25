'use client';

import { useEffect, useRef, useState } from 'react';
import { useCesium } from '@/contexts/cesium-context';

declare global {
    interface Window {
        Cesium: any;
    }
}

const TooltipContent = ({ data }: { data: any }) => {
    if (!data) return null;
    const propertyEntries = Object.entries(data.content).map(([key, value]) => {
        const displayValue = typeof value === 'number' ? value.toFixed(3) : String(value);
        return <li key={key}><strong>{key}:</strong> {displayValue}</li>;
    });
    return (
        <div
            className="absolute bg-gray-800 text-white p-3 rounded-md shadow-lg text-xs pointer-events-none z-50"
            style={{ top: data.top, left: data.left, transform: 'translate(15px, 15px)' }}
        >
            <p className="font-bold text-base mb-1">Entity Properties</p>
            <ul className="list-none space-y-1">{propertyEntries}</ul>
        </div>
    );
};

const ResourceModelViewer = () => {
    const { viewer, ready } = useCesium(); // Using new context
    const [properties, setProperties] = useState<string[]>([]);
    const [selectedProperty, setSelectedProperty] = useState<string>("");
    const [blockTransparency, setBlockTransparency] = useState(0.5);
    const [assayTransparency, setAssayTransparency] = useState(0.8);
    const [assayRangeFilter, setAssayRangeFilter] = useState<{ min: number; max: number } | null>(null);
    const [assayRangeBounds, setAssayRangeBounds] = useState<{ min: number; max: number } | null>(null);
    const [blockModelData, setBlockModelData] = useState<any>(null);
    const [assayData, setAssayData] = useState<any>(null);
    const [tooltip, setTooltip] = useState<{ display: boolean, top: number, left: number, content: any }>({ display: false, top: 0, left: 0, content: null });
    
    const entitiesRef = useRef<any[]>([]);

    // Effect for data bootstrapping
    useEffect(() => {
        if (!ready || !viewer) return;
        (async () => {
            const bmRes = await fetch('/BlockModel.geojson');
            const bm = await bmRes.json();
            setBlockModelData(bm);
            
            const keys = Object.keys(bm?.features?.[0]?.properties ?? {});
            setProperties(keys);
            
            const preferred = keys.includes("Kr, GRAPHITIC_CARBON in GM_Litho: GRSC")
                ? "Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"
                : (keys.includes("RescCalc") ? "RescCalc" : keys[0] ?? "");
            setSelectedProperty(preferred);

            const assayRes = await fetch('/assay_data.geojson');
            const assay = await assayRes.json();
            setAssayData(assay);
        })();
    }, [ready, viewer]);

    useEffect(() => {
        if (!blockModelData) return;
        let min = Infinity, max = -Infinity;
        blockModelData.features?.forEach((f: any) => {
            const v = Number(f.properties?.["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"]);
            if (Number.isFinite(v)) {
                if (v < min) min = v;
                if (v > max) max = v;
            }
        });
        if (min !== Infinity && max !== -Infinity) {
            setAssayRangeBounds({ min, max });
            setAssayRangeFilter(prev => prev ?? { min, max });
        }
    }, [blockModelData]);

    // Effect for tooltip picking
    useEffect(() => {
        if (!viewer) return;
        const Cesium = (window as any).Cesium;
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((movement: any) => {
            const p = viewer.scene.pick(movement.endPosition);
            if (Cesium.defined(p) && p.id && p.id.properties) {
                const now = viewer.clock.currentTime;
                setTooltip({ display: true, top: movement.endPosition.y, left: movement.endPosition.x, content: p.id.properties.getValue?.(now) ?? p.id.properties });
            } else {
                setTooltip({ display: false, top: 0, left: 0, content: null });
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        // FIX: Added cleanup for the handler
        return () => handler.destroy();
    }, [viewer]);

    // Main rendering effect
    useEffect(() => {
        if (!viewer || !blockModelData) return;
        const Cesium = (window as any).Cesium as typeof import('cesium');
        
        // Clear previous entities
        entitiesRef.current.forEach(entity => viewer.entities.remove(entity));
        entitiesRef.current = [];

        // Render Block Model
        let min = Infinity, max = -Infinity;
        if (selectedProperty === "Kr, GRAPHITIC_CARBON in GM_Litho: GRSC") {
            blockModelData.features.forEach((f:any) => {
                const v = parseFloat(f.properties[selectedProperty]);
                if (!isNaN(v)) { if (v < min) min = v; if (v > max) max = v; }
            });
        }

        blockModelData.features.forEach((feature: any) => {
            const { geometry, properties } = feature;
            let color;
            let shouldPlot = false;

            if (selectedProperty === "Kr, GRAPHITIC_CARBON in GM_Litho: GRSC") {
                const value = parseFloat(properties[selectedProperty]);
                if (!isNaN(value)) {
                    shouldPlot = true;
                    const ratio = max > min ? (value - min) / (max - min) : 0.5;
                    color = Cesium.Color.fromHsl(0.6 - ratio * 0.6, 1.0, 0.5).withAlpha(blockTransparency);
                }
            } else if (selectedProperty === "RescCalc") {
                const value = properties[selectedProperty];
                if (["Indicated", "Measured", "Inferred"].includes(value)) {
                    shouldPlot = true;
                    switch (value) {
                        case "Indicated": color = Cesium.Color.BLUE.withAlpha(blockTransparency); break;
                        case "Measured": color = Cesium.Color.GREEN.withAlpha(blockTransparency); break;
                        case "Inferred": color = Cesium.Color.YELLOW.withAlpha(blockTransparency); break;
                    }
                }
            }

            if (shouldPlot && assayRangeFilter && selectedProperty === "Kr, GRAPHITIC_CARBON in GM_Litho: GRSC") {
                const value = parseFloat(properties[selectedProperty]);
                if (Number.isFinite(value)) {
                    if (value < assayRangeFilter.min || value > assayRangeFilter.max) {
                        shouldPlot = false;
                    }
                }
            }

            if (shouldPlot) {
                const { dX, dY, dZ } = properties;
                const entity = viewer.entities.add({
                    position: Cesium.Cartesian3.fromDegrees(geometry.coordinates[0], geometry.coordinates[1], geometry.coordinates[2]),
                    box: { dimensions: new Cesium.Cartesian3(parseFloat(dX), parseFloat(dY), parseFloat(dZ)), material: color },
                    properties: properties
                });
                entitiesRef.current.push(entity);
            }
        });

        // Render Assay Data
        if (assayData) {
            // ... (assay rendering logic is the same as geospatial-viewer, can be reused/refactored later)
        }

        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(38.785, -4.805, 5000),
            orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90.0), roll: 0 },
            duration: 3
        });

        // FIX: Add a cleanup function for the main effect
        return () => {
            if (viewer && !viewer.isDestroyed()) {
                entitiesRef.current.forEach(entity => viewer.entities.remove(entity));
                entitiesRef.current = [];
            }
        };

    }, [viewer, blockModelData, assayData, selectedProperty, blockTransparency, assayTransparency, assayRangeFilter]);


    return (
        <div className="h-full w-full relative">
            {tooltip.display && <TooltipContent data={tooltip} />}
            <div style={{ position: 'absolute', top: 10, left: 10, background: 'white', padding: '10px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px', borderRadius: '8px' }}>
                <h4>Resource Model Controls</h4>
                {assayRangeFilter && assayRangeBounds && selectedProperty === "Kr, GRAPHITIC_CARBON in GM_Litho: GRSC" && (
                    <div>
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-semibold">Assay range filter</label>
                            <button
                                onClick={() => {
                                    if (assayRangeBounds) {
                                        setAssayRangeFilter({ ...assayRangeBounds });
                                    }
                                }}
                                className="text-[11px] text-orange-600"
                                type="button"
                            >
                                Reset
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                step="0.1"
                                value={assayRangeFilter.min}
                                onChange={(e) => setAssayRangeFilter(prev => prev ? ({
                                    min: Number(e.target.value),
                                    max: Math.max(Number(e.target.value), prev.max)
                                }) : prev)}
                                style={{ width: '100%' }}
                            />
                            <input
                                type="number"
                                step="0.1"
                                value={assayRangeFilter.max}
                                onChange={(e) => setAssayRangeFilter(prev => prev ? ({
                                    min: Math.min(prev.min, Number(e.target.value)),
                                    max: Number(e.target.value)
                                }) : prev)}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <input
                            type="range"
                            min={assayRangeBounds.min}
                            max={assayRangeBounds.max}
                            step="0.1"
                            value={assayRangeFilter.min}
                            onChange={(e) => setAssayRangeFilter(prev => prev ? ({
                                min: Number(e.target.value),
                                max: Math.max(Number(e.target.value), prev.max)
                            }) : prev)}
                        />
                        <input
                            type="range"
                            min={assayRangeBounds.min}
                            max={assayRangeBounds.max}
                            step="0.1"
                            value={assayRangeFilter.max}
                            onChange={(e) => setAssayRangeFilter(prev => prev ? ({
                                min: Math.min(prev.min, Number(e.target.value)),
                                max: Number(e.target.value)
                            }) : prev)}
                        />
                    </div>
                )}
                <div>
                    <label>Visualize Property: </label>
                    <select value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)} style={{width: "100%"}}>
                        {properties.map(prop => <option key={prop} value={prop}>{prop}</option>)}
                    </select>
                </div>
                <div>
                    <label>Block Transparency: </label>
                    <input type="range" min="0" max="1" step="0.05" value={blockTransparency} onChange={(e) => setBlockTransparency(parseFloat(e.target.value))} />
                </div>
                <div>
                    <label>Assay Transparency: </label>
                    <input type="range" min="0" max="1" step="0.05" value={assayTransparency} onChange={(e) => setAssayTransparency(parseFloat(e.target.value))} />
                </div>
            </div>
        </div>
    );
};

export default ResourceModelViewer;
