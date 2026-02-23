'use client';

import { useState, useEffect, useRef } from 'react';
import { useCesium } from '@/contexts/cesium-context';
import { useThreeSceneSafe } from '@/contexts/three-scene-context';
import * as THREE from 'three';
import { Ruler, X } from 'lucide-react'; // Assuming lucide-react is available or use standard SVGs

type Point = { x: number; y: number; z: number };

export default function MeasurementTool({
    mode,
    className,
}: {
    mode: 'cesium' | 'three';
    className?: string;
}) {
    const { viewer: cesiumViewer } = useCesium();
    const threeSceneContext = useThreeSceneSafe();
    const { camera: threeCamera, scene: threeScene, renderer: threeRenderer } =
        threeSceneContext ?? {};

    const [active, setActive] = useState(false);
    const [points, setPoints] = useState<Point[]>([]);
    const [distance, setDistance] = useState<number | null>(null);
    const [mousePos, setMousePos] = useState<{x: number, y: number} | null>(null);

    // Three.js specific refs
    const lineRef = useRef<THREE.Line | null>(null);
    const markersRef = useRef<THREE.Mesh[]>([]);

    // Cesium specific refs
    const cesiumEntitiesRef = useRef<any[]>([]);

    // Cleanup when mode changes or tool inactive
    useEffect(() => {
        return () => clearMeasurement();
    }, [mode, active]);

    const clearMeasurement = () => {
        setPoints([]);
        setDistance(null);
        
        // Clear Three.js
        if (lineRef.current) {
            threeScene?.remove(lineRef.current);
            lineRef.current.geometry.dispose();
            (lineRef.current.material as THREE.Material).dispose();
            lineRef.current = null;
        }
        markersRef.current.forEach(m => {
            threeScene?.remove(m);
            m.geometry.dispose();
            (m.material as THREE.Material).dispose();
        });
        markersRef.current = [];

        // Clear Cesium
        if (cesiumViewer) {
            cesiumEntitiesRef.current.forEach(e => cesiumViewer.entities.remove(e));
            cesiumEntitiesRef.current = [];
        }
        
        // Force render (guarded for Three-only mode)
        if (threeRenderer && threeScene && threeCamera) {
            threeRenderer.render(threeScene, threeCamera);
        }
        cesiumViewer?.scene.requestRender();
    };

    const handleCesiumClick = (e: any) => {
        if (!active || points.length >= 2 || !cesiumViewer) return;
        
        const Cesium = (window as any).Cesium;
        const position = cesiumViewer.scene.pickPosition(e.position);
        
        if (Cesium.defined(position)) {
            const cartographic = Cesium.Cartographic.fromCartesian(position);
            const point = { 
                x: position.x, 
                y: position.y, 
                z: position.z 
            };
            
            const newPoints = [...points, point];
            setPoints(newPoints);

            // Add marker
            const entity = cesiumViewer.entities.add({
                position: position,
                point: { pixelSize: 10, color: Cesium.Color.YELLOW }
            });
            cesiumEntitiesRef.current.push(entity);

            if (newPoints.length === 2) {
                // Calculate distance
                const p1 = new Cesium.Cartesian3(newPoints[0].x, newPoints[0].y, newPoints[0].z);
                const p2 = new Cesium.Cartesian3(newPoints[1].x, newPoints[1].y, newPoints[1].z);
                const d = Cesium.Cartesian3.distance(p1, p2);
                setDistance(d);

                // Add line
                const lineEntity = cesiumViewer.entities.add({
                    polyline: {
                        positions: [p1, p2],
                        width: 5,
                        material: Cesium.Color.YELLOW,
                        depthFailMaterial: Cesium.Color.YELLOW
                    }
                });
                cesiumEntitiesRef.current.push(lineEntity);
            }
        }
    };

    const handleThreeClick = (event: MouseEvent) => {
        if (!active || points.length >= 2 || !threeCamera || !threeScene || !threeRenderer) return;

        const rect = threeRenderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, threeCamera);

        // Raycast against all meshes in dynamic group or scene
        // We probably need a better target strategy, but intersecting the scene is a start
        // Ideally we intersect "terrain" or "objects"
        const intersects = raycaster.intersectObjects(threeScene.children, true);

        if (intersects.length > 0) {
            const p = intersects[0].point;
            const point = { x: p.x, y: p.y, z: p.z };
            const newPoints = [...points, point];
            setPoints(newPoints);

            // Add marker (Three.js)
            const geometry = new THREE.SphereGeometry(2); // Scale might need adjustment
            const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            const marker = new THREE.Mesh(geometry, material);
            marker.position.copy(p);
            threeScene.add(marker);
            markersRef.current.push(marker);

            if (newPoints.length === 2) {
                const p1 = new THREE.Vector3(newPoints[0].x, newPoints[0].y, newPoints[0].z);
                const p2 = new THREE.Vector3(newPoints[1].x, newPoints[1].y, newPoints[1].z);
                const d = p1.distanceTo(p2);
                setDistance(d);

                // Add line
                const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
                const lineMat = new THREE.LineBasicMaterial({ color: 0xffff00, depthTest: false, depthWrite: false }); // Always visible
                const line = new THREE.Line(lineGeo, lineMat);
                line.renderOrder = 999;
                threeScene.add(line);
                lineRef.current = line;
            }
        }
    };

    // Attach listeners
    useEffect(() => {
        if (!active) return;

        if (mode === 'cesium' && cesiumViewer) {
            const Cesium = (window as any).Cesium;
            const handler = new Cesium.ScreenSpaceEventHandler(cesiumViewer.scene.canvas);
            handler.setInputAction(handleCesiumClick, Cesium.ScreenSpaceEventType.LEFT_CLICK);
            
            return () => {
                handler.destroy();
            };
        } else if (mode === 'three' && threeRenderer) {
            const canvas = threeRenderer.domElement;
            const onClick = (e: MouseEvent) => handleThreeClick(e);
            canvas.addEventListener('click', onClick);
            return () => {
                canvas.removeEventListener('click', onClick);
            };
        }
    }, [active, mode, cesiumViewer, threeRenderer, points]); // Re-bind when points change to capture state

    return (
        <div className={`pointer-events-auto flex flex-col items-start gap-2 ${className ?? ''}`}>
            <button
                onClick={() => {
                    if (active) clearMeasurement();
                    setActive(!active);
                }}
                className={`p-2 rounded-full shadow-lg transition-colors ${active ? 'bg-yellow-500 text-black' : 'bg-white text-black hover:bg-gray-100'}`}
                title="Measure Distance"
            >
               {active ? <X size={24} /> : <Ruler size={24} />}
            </button>
            
            {active && (
                <div className="bg-white/90 p-3 rounded shadow-lg text-sm">
                    <div className="font-bold mb-1">Measurement Tool</div>
                    {points.length === 0 && <div className="text-gray-600">Click start point</div>}
                    {points.length === 1 && <div className="text-gray-600">Click end point</div>}
                    {points.length === 2 && distance !== null && (
                        <div>
                            <span className="font-bold text-lg">{distance >= 1000 ? `${(distance/1000).toFixed(2)} km` : `${distance.toFixed(2)} m`}</span>
                            <button onClick={clearMeasurement} className="ml-2 text-blue-600 underline text-xs">Reset</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
