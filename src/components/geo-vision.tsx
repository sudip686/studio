"use client";

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// ## Data Structures & Constants ##

// Define the data structure for type safety
interface DrillholeSegment {
    lon: number; // Longitude
    lat: number; // Latitude
    x?: number; // Local coordinate
    z?: number; // Local coordinate
    elevation: number; // Elevation from sea level
    depth_from: number;
    depth_to: number;
    hole_id: string;
    lithology?: string;
    graphitic_carbon?: number;
}

// Color map for different rock types
const LITHOLOGY_COLOR_MAP: { [key: string]: string } = {
    "Quartz-Feldspathic": "#FAD7A0",
    "GRSC": "#839192",
    "Felsic Dyke": "#F1948A",
    "Mafic Dyke": "#5B2C6F",
    "Pegmatite": "#76D7C4",
    "Breccia": "#AF601A",
    "Granulite": "#B3B6B7",
    "Khondalite": "#E6B0AA",
    "Marble": "#D4E6F1",
    "Not Recovearble": "#515A5A",
    "SOIL": "#A9DFBF",
    "Schist": "#AED6F1",
    "nan": "#FFFFFF",
    "UNKNOWN": "#cccccc",
};

// ## Geo Projection Utilities ##
const EARTH_RADIUS = 6371e3; // meters



// ## UI Components ##

// ## Legend Component ##
const Legend = ({ colorMode, assayRange }: { colorMode: 'lithology' | 'assay', assayRange: { min: number, max: number } }) => {
    return (
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-80 p-3 rounded-lg shadow-md max-w-xs text-sm pointer-events-auto">
            <h3 className="font-bold text-lg mb-2">{colorMode === 'lithology' ? 'Lithology' : 'Assay (Graphitic Carbon)'}</h3>
            {colorMode === 'lithology' ? (
                <ul className="space-y-1">
                    {Object.entries(LITHOLOGY_COLOR_MAP).map(([name, color]) => (
                        <li key={name} className="flex items-center">
                            <span className="inline-block w-4 h-4 rounded-full mr-2 border border-gray-400" style={{ backgroundColor: color }}></span>
                            <span>{name}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="flex flex-col items-center">
                    <div className="w-full h-6 rounded" style={{ background: 'linear-gradient(to right, hsl(120, 100%, 50%), hsl(0, 100%, 50%))' }}></div>
                    <div className="flex justify-between w-full text-xs mt-1">
                        <span>{assayRange.min.toFixed(2)}</span>
                        <span>{assayRange.max.toFixed(2)}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

// ## Tooltip Component ##
const DrillholeTooltip = ({ data, position }: { data: DrillholeSegment | null, position: { x: number, y: number } }) => {
    if (!data) return null;

    return (
        <div
            className="absolute bg-gray-800 text-white p-3 rounded-md shadow-lg text-xs pointer-events-none"
            style={{ left: `${position.x + 15}px`, top: `${position.y + 15}px`, transform: 'translateZ(0)' }} // Added transform for performance
        >
            <p className="font-bold text-base mb-1">Hole ID: {data.hole_id}</p>
            <ul className="list-none space-y-1">
                <li><strong>Lat:</strong> {data.lat.toFixed(5)}</li>
                <li><strong>Lon:</strong> {data.lon.toFixed(5)}</li>
                <li><strong>Depth From:</strong> {data.depth_from.toFixed(2)} m</li>
                <li><strong>Depth To:</strong> {data.depth_to.toFixed(2)} m</li>
                {data.lithology && <li><strong>Lithology:</strong> {data.lithology}</li>}
                {data.graphitic_carbon !== undefined && (
                    <li><strong>Graphitic Carbon:</strong> {data.graphitic_carbon.toFixed(3)} %</li>
                )}
            </ul>
        </div>
    );
};

// ## Compass Component ##
const Compass = ({ rotation }: { rotation: number }) => {
    return (
        <div className="absolute top-4 left-4 bg-white bg-opacity-80 p-2 rounded-full shadow-md w-16 h-16 flex items-center justify-center pointer-events-none">
            <div
                className="relative w-full h-full"
                style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.2s ease-out' }}
            >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 text-red-600 font-bold">N</div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-gray-500">S</div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500">W</div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500">E</div>
                <div className="absolute w-0.5 h-1/2 bg-red-600 top-0 left-1/2 -translate-x-1/2 origin-bottom"></div>
                <div className="absolute w-0.5 h-1/2 bg-gray-500 bottom-0 left-1/2 -translate-x-1/2 origin-top"></div>
            </div>
        </div>
    );
};


// ## Main GeoVision Component ##
const GeoVision = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const raycasterRef = useRef(new THREE.Raycaster());
    const mouseRef = useRef(new THREE.Vector2());

    const [drillholeData, setDrillholeData] = useState<{ lithology: DrillholeSegment[]; assay: DrillholeSegment[] } | null>(null);
    const [step, setStep] = useState(0);
    const [presentationSteps, setPresentationSteps] = useState<string[]>([]);
    const [assayRange, setAssayRange] = useState({ min: 0, max: 1 });

    const [tooltipData, setTooltipData] = useState<DrillholeSegment | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const [compassRotation, setCompassRotation] = useState(0);
    const [loadingStatus, setLoadingStatus] = useState('Idle'); // New state for debugging

    useEffect(() => {
        if (!mountRef.current) return;
        const currentMount = mountRef.current;

        const scene = new THREE.Scene();
        sceneRef.current = scene;
        scene.fog = new THREE.Fog(0xf0f4f5, 1000, 10000);
        scene.background = new THREE.Color(0xf0f4f5);

        const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 20000);
        cameraRef.current = camera;
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        currentMount.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controlsRef.current = controls;
        controls.enableDamping = true;

        scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(-500, 800, 500);
        scene.add(directionalLight);

        const gridHelper = new THREE.GridHelper(4000, 40);
        scene.add(gridHelper);

        const loadAndSetupData = async () => {
            try {
                setLoadingStatus('Fetching lithology data...');
                const lithologyResponse = await fetch('/lithology_data.geojson');
                if (!lithologyResponse.ok) throw new Error(`Failed to fetch lithology: ${lithologyResponse.statusText}`);
                const lithologyGeoJson = await lithologyResponse.json();
                const lithologyData: DrillholeSegment[] = lithologyGeoJson.features.map((f: any) => ({
                    lon: f.geometry.coordinates[0],
                    lat: f.geometry.coordinates[1],
                    elevation: f.geometry.coordinates[2],
                    ...f.properties
                }));
                setLoadingStatus('Lithology data loaded.');

                setLoadingStatus('Fetching assay data...');
                const assayResponse = await fetch('/assay_data.geojson');
                if (!assayResponse.ok) throw new Error(`Failed to fetch assay: ${assayResponse.statusText}`);
                const assayGeoJson = await assayResponse.json();
                const assayData: DrillholeSegment[] = assayGeoJson.features.map((f: any) => ({
                    lon: f.geometry.coordinates[0],
                    lat: f.geometry.coordinates[1],
                    elevation: f.geometry.coordinates[2],
                    ...f.properties
                }));
                setLoadingStatus('Assay data loaded.');

                setLoadingStatus('Fetching boundary data...');
                const boundaryResponse = await fetch('/mining_license_boundary.kml');
                if (!boundaryResponse.ok) throw new Error(`Failed to fetch boundary KML: ${boundaryResponse.statusText}`);
                const kmlText = await boundaryResponse.text();
                setLoadingStatus('Boundary data loaded.');

                setLoadingStatus('Processing data...');
                if (lithologyData.length > 0) {
                    const avgX = lithologyData.reduce((acc, p) => acc + p.x, 0) / lithologyData.length;
                    const avgY = lithologyData.reduce((acc, p) => acc + p.y, 0) / lithologyData.length;
                    const avgZ = lithologyData.reduce((acc, p) => acc + p.z, 0) / lithologyData.length;

                    const center = new THREE.Vector3(avgX, avgZ, avgY);
                    controls.target.copy(center);
                    camera.position.set(avgX, avgZ + 2000, avgY + 2000);
                    controls.update();
                }
                setDrillholeData({ lithology: lithologyData, assay: assayData });

                if (assayData.length > 0) {
                    const assayValues = assayData.map(p => p.graphitic_carbon).filter(v => v != null) as number[];
                    if (assayValues.length > 0) {
                        setAssayRange({ min: Math.min(...assayValues), max: Math.max(...assayValues) });
                    }
                }

                setPresentationSteps(['lithology_data', 'assay_data']);
                setLoadingStatus('Scene ready.');

            } catch (error: any) {
                console.error("Failed to load scene data:", error);
                setLoadingStatus(`Error: ${error.message}`);
            }
        };

        loadAndSetupData();

        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        };
        
        const handleMouseMove = (event: MouseEvent) => {
            const rect = currentMount.getBoundingClientRect();
            mouseRef.current.x = ((event.clientX - rect.left) / currentMount.clientWidth) * 2 - 1;
            mouseRef.current.y = -((event.clientY - rect.top) / currentMount.clientHeight) * 2 + 1;

            raycasterRef.current.setFromCamera(mouseRef.current, camera);
            const intersects = raycasterRef.current.intersectObjects(scene.children);
            
            const drillholeIntersect = intersects.find(i => i.object.userData.isDrillhole);

            if (drillholeIntersect) {
                setTooltipData(drillholeIntersect.object.userData as DrillholeSegment);
                setTooltipPosition({ x: event.clientX, y: event.clientY });
            } else {
                setTooltipData(null);
            }
        };

        const updateCompass = () => {
            if (!cameraRef.current) return;
            const cameraDirection = new THREE.Vector3();
            cameraRef.current.getWorldDirection(cameraDirection);
            const angle = Math.atan2(cameraDirection.x, cameraDirection.z);
            setCompassRotation(-angle * (180 / Math.PI));
        };
        
        window.addEventListener('resize', handleResize);
        currentMount.addEventListener('mousemove', handleMouseMove);
        controls.addEventListener('change', updateCompass);
        updateCompass();

        return () => {
            window.removeEventListener('resize', handleResize);
            currentMount?.removeEventListener('mousemove', handleMouseMove);
            controls.removeEventListener('change', updateCompass);
            if (currentMount && renderer.domElement.parentElement === currentMount) {
                currentMount.removeChild(renderer.domElement);
            }
        };
    }, []);

    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene || !drillholeData || presentationSteps.length === 0) return;

        const objectsToRemove = scene.children.filter(obj => obj.userData.isDrillhole);
        objectsToRemove.forEach(obj => scene.remove(obj));

        const currentStep = presentationSteps[step];
        const dataToRender = currentStep === 'lithology_data' ? drillholeData.lithology : drillholeData.assay;

        if (!dataToRender) return;

        const collarData = new Map<string, DrillholeSegment>();
        dataToRender.forEach(segment => {
            if (segment.depth_from === 0) {
                collarData.set(segment.hole_id, segment);
            }
        });

        dataToRender.forEach(segment => {
            const depth = segment.depth_to - segment.depth_from;
            if (depth <= 0) return;

            const collar = collarData.get(segment.hole_id);
            if (!collar) return;

            const holeGeometry = new THREE.CylinderGeometry(15, 15, depth, 12);
            let segmentColor = new THREE.Color(LITHOLOGY_COLOR_MAP["UNKNOWN"]);

            if (currentStep === 'lithology_data' && segment.lithology) {
                segmentColor = new THREE.Color(LITHOLOGY_COLOR_MAP[String(segment.lithology)] || LITHOLOGY_COLOR_MAP["UNKNOWN"]);
            } else if (currentStep === 'assay_data' && segment.graphitic_carbon !== undefined) {
                const range = assayRange.max - assayRange.min;
                const normalizedValue = range > 0 ? (segment.graphitic_carbon - assayRange.min) / range : 0.5;
                segmentColor.setHSL((1 - normalizedValue) * 0.33, 1, 0.5);
            }

            const holeMaterial = new THREE.MeshStandardMaterial({ color: segmentColor });
            const cylinder = new THREE.Mesh(holeGeometry, holeMaterial);
            
            const y_center = collar.z - (segment.depth_from + depth / 2);
            
            cylinder.position.set(collar.x, y_center, collar.y);
            
            cylinder.userData = { isDrillhole: true, ...segment };
            scene.add(cylinder);
        });

    }, [step, presentationSteps, drillholeData, assayRange]);

    const nextStep = () => setStep(s => Math.min(s + 1, presentationSteps.length - 1));
    const prevStep = () => setStep(s => Math.max(s - 1, 0));

    const isDrillingDataVisible = presentationSteps[step] === 'lithology_data' || presentationSteps[step] === 'assay_data';
    const colorMode = presentationSteps[step] === 'assay_data' ? 'assay' : 'lithology';

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="relative h-full w-full">
                        {/* UI Overlay */}
                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                            <Compass rotation={compassRotation} />
                            {isDrillingDataVisible && <Legend colorMode={colorMode} assayRange={assayRange} />}
                            <div className="absolute top-4 right-4 z-10 flex flex-col items-end space-y-2 pointer-events-auto">
                                <div className="flex space-x-2">
                                    <button onClick={prevStep} disabled={step === 0} className="p-2 rounded bg-white shadow-lg disabled:opacity-50">Previous</button>
                                    <button onClick={nextStep} disabled={step === presentationSteps.length - 1} className="p-2 rounded bg-white shadow-lg disabled:opacity-50">Next</button>
                                </div>
                            </div>
                             {/* Debugging Status */}
                            <div className="absolute top-20 left-4 bg-gray-800 text-white p-2 rounded shadow-lg text-xs">
                                <p>Status: {loadingStatus}</p>
                            </div>
                        </div>

                        <div ref={mountRef} className="h-full w-full" />
                        
                        <DrillholeTooltip data={tooltipData} position={tooltipPosition} />
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>3D Geo-Visualization</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export default GeoVision;