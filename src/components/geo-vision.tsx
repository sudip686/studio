'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

function project(lon: number, lat: number, centerLon: number, centerLat: number): { x: number; z: number } {
    const R = 6371e3; // Earth radius in meters
    const dLon = (lon - centerLon) * (Math.PI / 180);
    const dLat = (lat - centerLat) * (Math.PI / 180);
    const x = R * dLon * Math.cos(centerLat * Math.PI / 180);
    const z = R * dLat;
    return { x, z };
}


// ## Data Structures & Constants ##
interface DrillholeSegment {
    lon: number; // Longitude
    lat: number; // Latitude
    x?: number; // Local coordinate
    y?: number; // Local coordinate
    z?: number; // Local coordinate
    elevation: number; // Elevation from sea level
    depth_from: number;
    depth_to: number;
    hole_id: string;
    lithology?: string;
    graphitic_carbon?: number;
}

interface BlockSegment {
    lon: number; // Longitude
    lat: number; // Latitude
    x?: number; // Local coordinate
    y?: number; // Local coordinate
    z?: number; // Local coordinate
    elevation: number; // Elevation from sea level
    Id: string;
    X: string; // Original X coordinate (projected)
    Y: string; // Original Y coordinate (projected)
    Z: string; // Original Z coordinate (projected)
    dX: string; // Dimension X
    dY: string; // Dimension Y
    dZ: string; // Dimension Z
    "Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"?: string | number;
    RescCalc?: string;
}

interface Point {
    lon: number;
    lat: number;
    elevation: number;
}

interface GeoJsonFeature {
    type: "Feature";
    geometry: {
        type: string;
        coordinates: any;
    };
    properties: any;
}

// Type guard functions
function isDrillholeSegment(data: any): data is DrillholeSegment {
    return data !== null && typeof data === 'object' && 'hole_id' in data;
}

function isBlockSegment(data: any): data is BlockSegment {
    return data !== null && typeof data === 'object' && 'Id' in data && !('hole_id' in data);
}

// Color map for different rock types
const LITHOLOGY_COLOR_MAP: { [key: string]: string } = {
    "quartz-feldspathic": "#FAD7A0",
    "grsc": "#212323",
    "granulite": "#df26c4",
    "khondalite": "#1a3523",
    "marble": "#fafafa",
    "not recovearble": "#515A5A",
    "soil": "#6efe70",
    "schist": "#46f1b2",
    "nan": "#ffffff",
    "unknown": "#cccccc",
};

// ## Geo Projection Utilities ##
const EARTH_RADIUS = 6371e3; // meters

function getLonLatElev(coords: any) {
    if (coords && coords.length > 0 && Array.isArray(coords[0])) {
        // It's a LineString, return the first point's coords
        const [lon, lat, elev = 0] = coords[0];
        return { lon, lat, elev };
    }
    // It's a Point
    const [lon, lat, elev = 0] = coords;
    return { lon, lat, elev };
}

function pickProp<T>(obj: any, keys: string[]): T | undefined {
    if (!obj) return undefined;
    for (const key of keys) {
        const value = obj[key];
        if (value !== undefined) {
            return value as T;
        }
        // Try case-insensitive match
        for (const objKey in obj) {
            if (objKey.toLowerCase() === key.toLowerCase()) {
                return obj[objKey] as T;
            }
        }
    }
    return undefined;
}

function colorForLithology(raw?: string): string {
    const key = String(raw ?? 'unknown').trim().toLowerCase();
    return LITHOLOGY_COLOR_MAP[key] || '#cccccc';
}

const ASSAY_COLOR_STEPS = 20;
const assayColorCache: { [step: number]: string } = {};
function colorForAssay(vRaw: any, min: number, max: number): string {
    const v = Number(vRaw);
    let t = Number.isFinite(v) && max > min ? (v - min) / (max - min) : 0.5;
    t = Math.max(0, Math.min(1, t));
    
    const step = Math.floor(t * (ASSAY_COLOR_STEPS - 1));
    if (assayColorCache[step]) {
        return assayColorCache[step];
    }

    const r = t;
    const g = 1 - t;
    const b = 0;
    const color = new THREE.Color(r, g, b);
    const hexString = '#' + color.getHexString();
    assayColorCache[step] = hexString;
    return hexString;
}

const BLOCK_COLOR_STEPS = 20;
const blockColorCache: { [step: number]: string } = {};
function getBlockCarbonColor(value: any, minVal: number, maxVal: number): string {
    const v = Number(value);
    let t = Number.isFinite(v) && maxVal > minVal ? (v - minVal) / (maxVal - minVal) : 0.5;
    t = Math.max(0, Math.min(1, t));

    const step = Math.floor(t * (BLOCK_COLOR_STEPS - 1));
    if (blockColorCache[step]) {
        return blockColorCache[step];
    }

    const colorA = new THREE.Color(0x0099ff);
    const colorB = new THREE.Color(0xff0000);
    const finalColor = new THREE.Color().lerpColors(colorA, colorB, t);
    const hexString = '#' + finalColor.getHexString();
    blockColorCache[step] = hexString;
    return hexString;
}

const RESC_CALC_COLORS: { [key: string]: string } = {
    "Indicated": "#ff0000",
    "Measured": "#0000ff",
    "Inferred": "#00ff00",
    "Unknown": "#999999",
};
function getBlockRescColor(rescCalc: any): string {
    const v = String(rescCalc ?? 'Unknown');
    return RESC_CALC_COLORS[v] || RESC_CALC_COLORS['Unknown'];
}


// ## UI Components ##
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
                    <div className="w-full h-6 rounded" style={{ background: 'linear-gradient(to right, rgb(0, 255, 0), rgb(255, 0, 0))' }}></div>
                    <div className="flex justify-between w-full text-xs mt-1">
                        <span>{assayRange.min.toFixed(2)}</span>
                        <span>{assayRange.max.toFixed(2)}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

const DrillholeTooltip = ({ data, position }: { data: DrillholeSegment | null, position: { x: number, y: number } }) => {
    if (!data) return null;

    return (
        <div
            className="absolute bg-gray-800 text-white p-3 rounded-md shadow-lg text-xs pointer-events-none"
            style={{ left: `${position.x + 15}px`, top: `${position.y + 15}px`, transform: 'translateZ(0)' }}
        >
            <p className="font-bold text-base mb-1">Hole ID: {data.hole_id}</p>
            <ul className="list-none space-y-1">
                {data.lat && <li><strong>Lat:</strong> {data.lat.toFixed(5)}</li>}
                {data.lon && <li><strong>Lon:</strong> {data.lon.toFixed(5)}</li>}
                <li><strong>Depth From:</strong> {data.depth_from.toFixed(2)} m</li>
                <li><strong>Depth To:</strong> {data.depth_to.toFixed(2)} m</li>
                {data.lithology && <li><strong>Lithology:</strong> {data.lithology}</li>}
                {data.graphitic_carbon !== undefined && (
                    <li><strong>Graphitic Carbon:</strong> {Number(data.graphitic_carbon).toFixed(3)} %</li>
                )}
            </ul>
        </div>
    );
};

const BlockTooltip = ({ data, position }: { data: BlockSegment | null, position: { x: number, y: number } }) => {
    if (!data) return null;

    const propertyEntries = Object.entries(data).map(([key, value]) => {
        if (['lon', 'lat', 'x', 'y', 'z', 'elevation', 'dX', 'dY', 'dZ'].includes(key)) return null;
        const displayValue = typeof value === 'number' ? value.toFixed(3) : String(value);
        return <li key={key}><strong>{key}:</strong> {displayValue}</li>;
    }).filter(Boolean);

    return (
        <div
            className="absolute bg-gray-800 text-white p-3 rounded-md shadow-lg text-xs pointer-events-none"
            style={{ left: `${position.x + 15}px`, top: `${position.y + 15}px`, transform: 'translateZ(0)' }}
        >
            <p className="font-bold text-base mb-1">Block ID: {data.Id}</p>
            <ul className="list-none space-y-1">
                {propertyEntries}
            </ul>
        </div>
    );
};

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

const ResourceReport = () => {
    return (
        <div className="absolute top-24 right-4 bg-gray-900 bg-opacity-75 p-4 rounded-lg text-white text-xs w-96 pointer-events-auto">
            <h4 className="font-bold text-base mb-2">Report</h4>
            <div className="mb-2">
                <p><strong>Cut-off:</strong> Kr, GRAPHITIC_CARBON in GM_Litho: GRSC ≥ 4.00%</p>
                <p><strong>Filter:</strong> None</p>
                <p><strong>Density:</strong> 2.2 g/cm³</p>
            </div>
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b">
                        <th className="pb-1">RescCalc</th>
                        <th className="pb-1 text-right">Volume (m³)</th>
                        <th className="pb-1 text-right">Mass (t)</th>
                        <th className="pb-1 text-right">Avg Cg (%)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Measured</td>
                        <td className="text-right">13,145,431</td>
                        <td className="text-right">28,919,949</td>
                        <td className="text-right">5.42</td>
                    </tr>
                    <tr>
                        <td>Indicated</td>
                        <td className="text-right">119,665,518</td>
                        <td className="text-right">263,264,140</td>
                        <td className="text-right">4.97</td>
                    </tr>
                    <tr className="font-bold border-t">
                        <td>M + I</td>
                        <td className="text-right">132,810,949</td>
                        <td className="text-right">292,184,088</td>
                        <td className="text-right">5.01</td>
                    </tr>
                    <tr>
                        <td>Inferred</td>
                        <td className="text-right">28,515,302</td>
                        <td className="text-right">62,733,664</td>
                        <td className="text-right">4.64</td>
                    </tr>
                </tbody>
            </table>
            <p className="text-gray-400 mt-2 text-center text-[10px]">Differences may occur in totals due to rounding.</p>
        </div>
    );
};

const ClassificationLegend = () => {
    const legendItems = {
        "Measured": "#0000ff", // blue
        "Indicated": "#ff0000", // red
        "Inferred": "#00ff00", // green
    };

    return (
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-80 p-3 rounded-lg shadow-md max-w-xs text-sm pointer-events-auto">
            <h3 className="font-bold text-lg mb-2">Classification</h3>
            <ul className="space-y-1">
                {Object.entries(legendItems).map(([name, color]) => (
                    <li key={name} className="flex items-center">
                        <span className="inline-block w-4 h-4 mr-2 border border-gray-400" style={{ backgroundColor: color }}></span>
                        <span>{name}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};


// ## Main GeoVision Component ##
const GeoVision = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const labelRendererRef = useRef<CSS2DRenderer | null>(null);
    const raycasterRef = useRef(new THREE.Raycaster());
    const mouseRef = useRef(new THREE.Vector2());

    const [drillholeData, setDrillholeData] = useState<{ lithology: any[]; assay: any[] } | null>(null);
    const [blockModelData, setBlockModelData] = useState<BlockSegment[] | null>(null);
    const [modelCenter, setModelCenter] = useState({ x: 0, y: 0, z: 0 });
    const [step, setStep] = useState(0);
    const [presentationSteps, setPresentationSteps] = useState<string[]>([]);
    const [assayRange, setAssayRange] = useState({ min: 0, max: 1 });
    const [blockTransparency, setBlockTransparency] = useState(0.8);

    const [tooltipData, setTooltipData] = useState<DrillholeSegment | BlockSegment | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const [compassRotation, setCompassRotation] = useState(0);
    const [loadingStatus, setLoadingStatus] = useState('Idle');

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
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        currentMount.appendChild(renderer.domElement);

        const labelRenderer = new CSS2DRenderer();
        labelRenderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        labelRenderer.domElement.style.position = 'absolute';
        labelRenderer.domElement.style.top = '0px';
        labelRenderer.domElement.style.pointerEvents = 'none';
        currentMount.appendChild(labelRenderer.domElement);
        labelRendererRef.current = labelRenderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controlsRef.current = controls;
        controls.enableDamping = true;

        scene.add(new THREE.HemisphereLight(0xffffff, 0x666688, 0.9));
        const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(-1500, 2000, 1200); scene.add(key);
        const fill = new THREE.DirectionalLight(0xffffff, 0.6); fill.position.set(1500, 600, -1200); scene.add(fill);

        const gridHelper = new THREE.GridHelper(4000, 40);
        scene.add(gridHelper);

        const loadAndSetupData = async () => {
            try {
                setLoadingStatus('Fetching lithology data...');
                const lithologyResponse = await fetch('/lithology_data.geojson');
                if (!lithologyResponse.ok) throw new Error(`Failed to fetch lithology: ${lithologyResponse.statusText}`);
                const lithologyGeoJson = await lithologyResponse.json();
                
                setLoadingStatus('Fetching assay data...');
                const assayResponse = await fetch('/assay_data.geojson');
                if (!assayResponse.ok) throw new Error(`Failed to fetch assay: ${assayResponse.statusText}`);
                const assayGeoJson = await assayResponse.json();
                
                setLoadingStatus('Fetching block model data...');
                const blockModelResponse = await fetch('/BlockModel.geojson');
                if (!blockModelResponse.ok) throw new Error(`Failed to fetch block model: ${blockModelResponse.statusText}`);
                const blockModelGeoJson = await blockModelResponse.json();
                
                setLoadingStatus('Processing data...');

                const lithologyData = lithologyGeoJson.features;
                const assayData = assayGeoJson.features;
                
                const blockModelData: BlockSegment[] = blockModelGeoJson.features.map((f:any) => {
                    const [lon, lat, elev = 0] = f.geometry.type === "Point"
                        ? f.geometry.coordinates
                        : (Array.isArray(f.geometry.coordinates) ? f.geometry.coordinates[0]?.[0] ?? [0,0,0] : [0,0,0]);

                    const p = f.properties ?? {};
                    // Coerce dims
                    const dX = Number(p.dX ?? p.dx ?? 10);
                    const dY = Number(p.dY ?? p.dy ?? 10);
                    const dZ = Number(p.dZ ?? p.dz ?? 10);

                    // Coerce grade
                    const rawCg = p["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"];
                    const cg = Number(rawCg);
                    const cgNum = Number.isFinite(cg) ? cg : NaN;

                    return {
                        lon, lat, elevation: elev,
                        Id: String(p.Id ?? ''),
                        X: String(p.X ?? ''), Y: String(p.Y ?? ''), Z: String(p.Z ?? ''),
                        dX: String(dX), dY: String(dY), dZ: String(dZ),
                        "Kr, GRAPHITIC_CARBON in GM_Litho: GRSC": Number.isFinite(cgNum) ? cgNum : String(rawCg ?? ''),
                        RescCalc: p.RescCalc
                    };
                });
                
                // --- Centering Logic ---
                // Use only the drillhole data for centering, as the block model coordinates might be throwing off the average.
                const drillholePoints: Point[] = [...lithologyData.map((f:any) => getLonLatElev(f.geometry.coordinates)), ...assayData.map((f:any) => getLonLatElev(f.geometry.coordinates))];
                
                let centerLon = 0;
                let centerLat = 0;

                if (drillholePoints.length > 0) {
                    centerLon = drillholePoints.reduce((acc, p: Point) => acc + p.lon, 0) / drillholePoints.length;
                    centerLat = drillholePoints.reduce((acc, p: Point) => acc + p.lat, 0) / drillholePoints.length;
                    console.log('Calculated model center from drillholes (Lon, Lat):', centerLon, centerLat);
                } else if (blockModelData.length > 0) { // Fallback to block model data for centering
                    centerLon = blockModelData.reduce((acc, b: BlockSegment) => acc + b.lon, 0) / blockModelData.length;
                    centerLat = blockModelData.reduce((acc, b: BlockSegment) => acc + b.lat, 0) / blockModelData.length;
                    console.warn('No drillhole data points found. Centering model using block model data (Lon, Lat):', centerLon, centerLat);
                } else {
                    console.error("No drillhole or block model data points found to center the model.");
                    return; // Cannot proceed without data
                }

                setModelCenter({ x: centerLon, y: centerLat, z: 0 });

                // Project block model coordinates based on the new center (now always defined)
                for (const b of blockModelData) {
                  const { x, z } = project(b.lon, b.lat, centerLon, centerLat);
                  (b as any).x = x;
                  (b as any).y = -z;            // scene Z
                  (b as any).z = b.elevation;   // scene Y
                }

                // Set camera to look at the center of the model
                const center = new THREE.Vector3(0, 0, 0);
                controls.target.copy(center);
                camera.position.set(0, 2000, 2000);
                controls.update();

                setDrillholeData({ lithology: lithologyData, assay: assayData });
                setBlockModelData(blockModelData);

                if (assayData.length > 0) {
                    const assayValues = assayData
                    .map((p: GeoJsonFeature) => p.properties.graphitic_carbon)
                    .filter((v: any): v is number => typeof v === 'number' && !Number.isNaN(v));
                    if (assayValues.length > 0) {
                        setAssayRange({ min: Math.min(...assayValues), max: Math.max(...assayValues) });
                    }
                }

                setPresentationSteps(['lithology_data', 'assay_data', 'block_model_carbon', 'block_model_recalc', 'block_model_resc']);
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
            if (labelRendererRef.current) {
                labelRendererRef.current.render(scene, camera);
            }
        };
        animate();

        const handleResize = () => {
            camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
            if (labelRendererRef.current) {
                labelRendererRef.current.setSize(currentMount.clientWidth, currentMount.clientHeight);
            }
        };
        
        const handleMouseMove = (event: MouseEvent) => {
            if (!currentMount || !sceneRef.current || !cameraRef.current) return;
            const scene = sceneRef.current;
            const camera = cameraRef.current;

            const rect = currentMount.getBoundingClientRect();
            mouseRef.current.x = ((event.clientX - rect.left) / currentMount.clientWidth) * 2 - 1;
            mouseRef.current.y = -((event.clientY - rect.top) / currentMount.clientHeight) * 2 + 1;

            raycasterRef.current.setFromCamera(mouseRef.current, camera);
            const intersects = raycasterRef.current.intersectObjects(scene.children, true);

            if (intersects.length > 0) {
                const intersect = intersects[0];
                const intersectedObject = intersect.object;
                let dataToShow: DrillholeSegment | BlockSegment | null = null;

                if (intersect.instanceId !== undefined && intersectedObject.userData.instanceData) {
                    dataToShow = intersectedObject.userData.instanceData[intersect.instanceId];
                } else if (intersectedObject.userData && (isDrillholeSegment(intersectedObject.userData) || isBlockSegment(intersectedObject.userData))) {
                    dataToShow = intersectedObject.userData;
                }

                if (dataToShow) {
                    setTooltipData(dataToShow);
                    setTooltipPosition({ x: event.clientX, y: event.clientY });
                } else {
                    setTooltipData(null);
                }
            } else {
                setTooltipData(null);
            }
        };

        const updateCompass = () => {
            if (!cameraRef.current) return;
            const cameraDirection = new THREE.Vector3();
            camera.getWorldDirection(cameraDirection);
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
            controls.dispose();

            if (labelRendererRef.current && labelRendererRef.current.domElement.parentElement === currentMount) {
                currentMount.removeChild(labelRendererRef.current.domElement);
            }
            if (currentMount && renderer.domElement.parentElement === currentMount) {
                currentMount.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, []);

    const currentStep = presentationSteps[step];

    useEffect(() => {
        const scene = sceneRef.current;
        // Ensure all data is loaded before proceeding
        if (!scene || !drillholeData || !blockModelData || presentationSteps.length === 0) {
            return;
        }

        // Clear previously rendered objects from the scene
        const objectsToRemove = scene.children.filter(obj => 
            obj.userData.isDrillhole || obj.userData.isBlock || obj.userData.isLabel
        );
        objectsToRemove.forEach(obj => {
            scene.remove(obj);
            if (obj instanceof THREE.InstancedMesh) {
                obj.geometry.dispose();
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
                obj.dispose();
            }
        });
        
        const isRescCalcView = currentStep === 'block_model_resc' || currentStep === 'block_model_recalc';

        if (isRescCalcView) {
            const nebLabelDiv = document.createElement('div');
            nebLabelDiv.className = 'text-white bg-black bg-opacity-50 px-2 py-1 rounded text-sm';
            nebLabelDiv.textContent = 'NEB';
            const nebLabel = new CSS2DObject(nebLabelDiv);
            nebLabel.position.set(modelCenter.x, modelCenter.z + 400, modelCenter.y);
            nebLabel.userData = { isLabel: true };
            scene.add(nebLabel);

            const gbenLabelDiv = document.createElement('div');
            gbenLabelDiv.className = 'text-white bg-black bg-opacity-50 px-2 py-1 rounded text-sm';
            gbenLabelDiv.textContent = 'Gbengbeden';
            const gbenLabel = new CSS2DObject(gbenLabelDiv);
            gbenLabel.position.set(modelCenter.x + 800, modelCenter.z + 500, modelCenter.y - 200);
            gbenLabel.userData = { isLabel: true };
            scene.add(gbenLabel);
        }

        const centerLon = modelCenter.x;
        const centerLat = modelCenter.y;

        // Function to convert geographic coordinates to scene coordinates
        const projectCoordinates = (lon: number, lat: number, elevation: number) => {
            const { x, z } = project(lon, lat, centerLon, centerLat);
            return new THREE.Vector3(x, elevation, -z);
        };

        // Render drillhole data (lithology or assay)
        if (currentStep === 'lithology_data' || currentStep === 'assay_data') {
            const dataToRender = currentStep === 'lithology_data' ? drillholeData.lithology : drillholeData.assay;
            if (!dataToRender) return;

            // Group data by color
            const groupedByColor: { [color: string]: any[] } = {};
            dataToRender.forEach(feature => {
                let colorKey: string;
                if (currentStep === 'lithology_data') {
                    const lith = pickProp<string>(feature.properties, ['lithology']);
                    colorKey = colorForLithology(lith);
                } else { // assay_data
                    const cg = pickProp<any>(feature.properties, ['graphitic_carbon', 'cg', 'cg_percent']);
                    colorKey = colorForAssay(cg, assayRange.min, assayRange.max);
                }
                if (!groupedByColor[colorKey]) {
                    groupedByColor[colorKey] = [];
                }
                groupedByColor[colorKey].push(feature);
            });

            // Create an InstancedMesh for each color group
            Object.entries(groupedByColor).forEach(([colorHex, features]) => {
                const material = new THREE.MeshStandardMaterial({ color: colorHex });
                const cylinderGeometry = new THREE.CylinderGeometry(20, 20, 1, 12);
                const instancedCylinders = new THREE.InstancedMesh(cylinderGeometry, material, features.length);
                instancedCylinders.userData.isDrillhole = true;
                
                const drillholeInstanceData: (Partial<DrillholeSegment> | null)[] = new Array(features.length).fill(null);

                const matrix = new THREE.Matrix4();
                const position = new THREE.Vector3();
                const quaternion = new THREE.Quaternion();
                const scale = new THREE.Vector3();

                features.forEach((feature, instanceIdx) => {
                    let startCoords, endCoords;

                    if (feature.geometry.type === 'LineString') {
                        startCoords = feature.geometry.coordinates[0];
                        endCoords = feature.geometry.coordinates[1];
                    } else if (feature.geometry.type === 'Point') {
                        startCoords = feature.geometry.coordinates;
                        const props = feature.properties;
                        const depthFrom = Number(pickProp(props, ['depth_from', 'from']));
                        const depthTo = Number(pickProp(props, ['depth_to', 'to']));
                        const len = Math.abs(depthTo - depthFrom) || 1;
                        const az = Number(pickProp(props, ['azimuth'])) * (Math.PI / 180) || 0;
                        const inc = Number(pickProp(props, ['inclination'])) * (Math.PI / 180) || 0;
                        const startLon = startCoords[0];
                        const startLat = startCoords[1];
                        const startElev = startCoords[2] || 0;
                        const deltaZ = len * Math.cos(inc);
                        const horizontalDistance = len * Math.sin(inc);
                        const metersPerDegreeLat = EARTH_RADIUS * (Math.PI / 180);
                        const metersPerDegreeLon = EARTH_RADIUS * Math.cos(startLat * (Math.PI / 180)) * (Math.PI / 180);
                        const deltaX = horizontalDistance * Math.sin(az);
                        const deltaY = horizontalDistance * Math.cos(az);
                        const endLon = startLon + (deltaX / metersPerDegreeLon);
                        const endLat = startLat + (deltaY / metersPerDegreeLat);
                        const endElev = startElev - deltaZ;
                        endCoords = [endLon, endLat, endElev];
                    } else {
                        return;
                    }

                    if (!startCoords || !endCoords) {
                        if (feature.geometry.type === 'Point') {
                            const p = getLonLatElev(feature.geometry.coordinates);
                            startCoords = [p.lon, p.lat, p.elev];
                            endCoords = [p.lon, p.lat, p.elev - 2];
                        } else {
                            return;
                        }
                    }

                    const startPoint = projectCoordinates(startCoords[0], startCoords[1], startCoords[2]);
                    const endPoint = projectCoordinates(endCoords[0], endCoords[1], endCoords[2]);
                    const length = startPoint.distanceTo(endPoint);
                    if (length === 0) return;

                    position.copy(startPoint).add(endPoint).divideScalar(2);
                    const direction = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
                    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
                    scale.set(1, length, 1);
                    matrix.compose(position, quaternion, scale);
                    instancedCylinders.setMatrixAt(instanceIdx, matrix);

                    drillholeInstanceData[instanceIdx] = { ...feature.properties, lon: startCoords[0], lat: startCoords[1], elevation: startCoords[2] };
                });

                instancedCylinders.count = features.length;
                instancedCylinders.userData.instanceData = drillholeInstanceData;
                instancedCylinders.instanceMatrix.needsUpdate = true;
                scene.add(instancedCylinders);
            });

        } else if (currentStep === 'block_model_carbon' || currentStep === 'block_model_resc' || currentStep === 'block_model_recalc') {
            if (blockModelData) {
                const groupedByColor: { [colorHex: string]: any[] } = {};

                if (currentStep === "block_model_carbon") {
                    let minVal = -Infinity, maxVal = Infinity;
                    for (const b of blockModelData) {
                        const v = Number(b["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"]);
                        if (!Number.isNaN(v)) {
                            minVal = Math.min(minVal, v);
                            maxVal = Math.max(maxVal, v);
                        }
                    }
                    blockModelData.forEach(block => {
                        const value = Number(block["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"]);
                        const colorKey = getBlockCarbonColor(value, minVal, maxVal);
                        if (!groupedByColor[colorKey]) {
                            groupedByColor[colorKey] = [];
                        }
                        groupedByColor[colorKey].push(block);
                    });
                } else { // block_model_resc or block_model_recalc
                    blockModelData.forEach(block => {
                        const colorKey = getBlockRescColor(block.RescCalc);
                        if (!groupedByColor[colorKey]) {
                            groupedByColor[colorKey] = [];
                        }
                        groupedByColor[colorKey].push(block);
                    });
                }

                // Render one InstancedMesh per color group
                Object.entries(groupedByColor).forEach(([colorHex, blocks]) => {
                    const material = new THREE.MeshStandardMaterial({ 
                        color: colorHex, 
                        transparent: true, 
                        opacity: blockTransparency 
                    });
                    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
                    const instancedBoxes = new THREE.InstancedMesh(boxGeometry, material, blocks.length);
                    instancedBoxes.userData.isBlock = true;
                    const blockInstanceData: (BlockSegment | null)[] = new Array(blocks.length).fill(null);

                    const matrix = new THREE.Matrix4();
                    const position = new THREE.Vector3();
                    const quaternion = new THREE.Quaternion();
                    const scale = new THREE.Vector3();

                    blocks.forEach((block, instanceIdx) => {
                        const dX = Number(block.dX) || 10;
                        const dY = Number(block.dY) || 10;
                        const dZ = Number(block.dZ) || 10;

                        if (dX <= 0 || dY <= 0 || dZ <= 0) return;
                        if (block.x == null || Number.isNaN(block.x) || block.y == null || Number.isNaN(block.y) || block.z == null || Number.isNaN(block.z)) return;

                        position.set(block.x, block.z, block.y);
                        scale.set(dX, dZ, dY);
                        matrix.compose(position, quaternion, scale);
                        instancedBoxes.setMatrixAt(instanceIdx, matrix);
                        blockInstanceData[instanceIdx] = block;
                    });

                    instancedBoxes.count = blocks.length;
                    instancedBoxes.userData.instanceData = blockInstanceData;
                    instancedBoxes.instanceMatrix.needsUpdate = true;
                    scene.add(instancedBoxes);
                });
            }

            const traceData = drillholeData.lithology;
            if (traceData) {
                const cylinderGeometry = new THREE.CylinderGeometry(5, 5, 1, 8);
                const material = new THREE.MeshStandardMaterial({ color: 0x505050 });
                const instancedCylinders = new THREE.InstancedMesh(cylinderGeometry, material, traceData.length);
                instancedCylinders.userData.isDrillhole = true;
                const drillholeInstanceData: (Partial<DrillholeSegment> | null)[] = new Array(traceData.length).fill(null);

                let instanceIdx = 0;
                const matrix = new THREE.Matrix4();
                const position = new THREE.Vector3();
                const quaternion = new THREE.Quaternion();
                const scale = new THREE.Vector3();

                traceData.forEach(feature => {
                    if (feature.geometry.type === 'LineString') {
                        const [startCoords, endCoords] = feature.geometry.coordinates;
                        
                        const startPoint = projectCoordinates(startCoords[0], startCoords[1], startCoords[2]);
                        const endPoint = projectCoordinates(endCoords[0], endCoords[1], endCoords[2]);

                        const length = startPoint.distanceTo(endPoint);
                        if (length === 0) return;

                        position.copy(startPoint).add(endPoint).divideScalar(2);
                        
                        const direction = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
                        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

                        scale.set(1, length, 1);

                        matrix.compose(position, quaternion, scale);
                        instancedCylinders.setMatrixAt(instanceIdx, matrix);
                        
                        drillholeInstanceData[instanceIdx] = {
                            ...feature.properties,
                            lon: startCoords[0],
                            lat: startCoords[1],
                            elevation: startCoords[2],
                        };
                        instanceIdx++;
                    }
                });

                instancedCylinders.count = instanceIdx;
                instancedCylinders.userData.instanceData = drillholeInstanceData;
                instancedCylinders.instanceMatrix.needsUpdate = true;
                scene.add(instancedCylinders);
            }
        }
    }, [step, presentationSteps, drillholeData, blockModelData, assayRange, blockTransparency, modelCenter]);

    const nextStep = () => setStep(s => Math.min(s + 1, presentationSteps.length - 1));
    const prevStep = () => setStep(s => Math.max(s - 1, 0));

    const isDrillingDataVisible = presentationSteps[step] === 'lithology_data' || presentationSteps[step] === 'assay_data';
    const isRescCalcView = currentStep === 'block_model_resc' || currentStep === 'block_model_recalc';
    const colorMode = presentationSteps[step] === 'assay_data' ? 'assay' : 'lithology';

    return (
        <div className="relative h-full w-full">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <Compass rotation={compassRotation} />
                {isDrillingDataVisible && <Legend colorMode={colorMode} assayRange={assayRange} />}
                {isRescCalcView && <ClassificationLegend />}
                <div className="absolute top-4 right-4 z-10 flex flex-col items-end space-y-2 pointer-events-auto">
                    {isRescCalcView && <ResourceReport />}
                    <div className="flex space-x-2 mt-2">
                        <button onClick={prevStep} disabled={step === 0} className="p-2 rounded bg-white shadow-lg disabled:opacity-50">Previous</button>
                        <button onClick={nextStep} disabled={step === presentationSteps.length - 1} className="p-2 rounded bg-white shadow-lg disabled:opacity-50">Next</button>
                    </div>
                    {currentStep && currentStep.startsWith('block_model_') && (
                        <div className="flex flex-col items-end space-y-2 bg-white p-2 rounded shadow-lg mt-2">
                            <label className="text-sm font-bold">Block Opacity:</label>
                            <input
                                name="block-opacity"
                                type="range"
                                min="0" max="1" step="0.05"
                                value={blockTransparency}
                                onChange={(e) => setBlockTransparency(parseFloat(e.target.value))}
                                className="w-24"
                            />
                        </div>
                    )}
                </div>
                <div className="absolute top-20 left-4 bg-gray-800 text-white p-2 rounded shadow-lg text-xs">
                    <p>Status: {loadingStatus}</p>
                </div>
            </div>

            <div ref={mountRef} className="h-full w-full" />
            
            {isBlockSegment(tooltipData) ? (
                <BlockTooltip data={tooltipData} position={tooltipPosition} />
            ) : isDrillholeSegment(tooltipData) ? (
                <DrillholeTooltip data={tooltipData} position={tooltipPosition} />
            ) : null}
        </div>
    );
};

export default GeoVision;
