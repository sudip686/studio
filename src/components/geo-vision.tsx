'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// ## Data Structures & Constants ##
interface DrillholeSegment {
    lon: number; lat: number; elevation: number; depth_from: number; depth_to: number; hole_id: string;
    lithology?: string; graphitic_carbon?: number; feature: any;
}
interface BlockSegment {
    lon: number; lat: number; elevation: number; Id: string; dX: number; dY: number; dZ: number;
    "Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"?: string | number; RescCalc?: string; feature: any;
}
interface Point { lon: number; lat: number; elevation: number; }

// Type guard functions
function isDrillholeSegment(data: any): data is DrillholeSegment { return data !== null && typeof data === 'object' && 'hole_id' in data; }
function isBlockSegment(data: any): data is BlockSegment { return data !== null && typeof data === 'object' && 'Id' in data && !('hole_id' in data); }

const LITHOLOGY_COLOR_MAP: { [key: string]: string } = {
    "quartz-feldspathic": "#FAD7A0", "grsc": "#212323", "granulite": "#df26c4", "khondalite": "#1a3523", "marble": "#fafafa",
    "not recovearble": "#515A5A", "soil": "#6efe70", "schist": "#46f1b2", "nan": "#ffffff", "unknown": "#cccccc",
};

function pickProp<T>(obj: any, keys: string[]): T | undefined {
    if (!obj) return undefined;
    for (const key of keys) {
        const value = obj[key];
        if (value !== undefined) return value as T;
        for (const objKey in obj) { if (objKey.toLowerCase() === key.toLowerCase()) return obj[objKey] as T; }
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
    if (assayColorCache[step]) return assayColorCache[step];
    const r = t, g = 1 - t, b = 0;
    const color = new THREE.Color(r, g, b);
    const hexString = '#' + color.getHexString();
    assayColorCache[step] = hexString;
    return hexString;
}

const CARBON_COLOR_MAP: { [key: string]: string } = {
    LOW: '#00ff00', MEDIUM: '#ffa500', HIGH: '#ff0000', VERY_HIGH: '#ff00ff', DEFAULT: '#cccccc'
};
function getBlockCarbonColor(value: any): string {
    const v = Number(value);
    if (!Number.isFinite(v)) return CARBON_COLOR_MAP.DEFAULT;
    if (v > 5.0) return CARBON_COLOR_MAP.VERY_HIGH;
    if (v > 2.0) return CARBON_COLOR_MAP.HIGH;
    if (v > 0.5) return CARBON_COLOR_MAP.MEDIUM;
    if (v > 0.3) return CARBON_COLOR_MAP.LOW;
    return CARBON_COLOR_MAP.DEFAULT;
}

const RESC_CALC_COLORS: { [key: string]: string } = {
    "Indicated": "#ff0000", "Measured": "#0000ff", "Inferred": "#00ff00", "Unknown": "#999999",
};
function getBlockRescColor(rescCalc: any): string {
    const v = String(rescCalc ?? 'Unknown').trim();
    return RESC_CALC_COLORS[v] || RESC_CALC_COLORS['Unknown'];
}

// ## UI Components ##
const LithologyLegend = () => (
    <div className="absolute bottom-4 left-4 bg-gray-900 bg-opacity-80 p-3 rounded-lg shadow-md max-w-xs text-sm pointer-events-auto text-white">
        <h3 className="font-bold text-lg mb-2">Lithology</h3>
        <ul className="space-y-1">
            {Object.entries(LITHOLOGY_COLOR_MAP).map(([name, color]) => (
                <li key={name} className="flex items-center">
                    <span className="inline-block w-4 h-4 rounded-full mr-2 border border-gray-400" style={{ backgroundColor: color }}></span>
                    <span style={{textTransform: 'capitalize'}}>{name}</span>
                </li>
            ))}
        </ul>
    </div>
);

const AssayLegend = ({ assayRange }: { assayRange: { min: number, max: number } }) => (
    <div className="absolute bottom-4 left-4 bg-gray-900 bg-opacity-80 p-3 rounded-lg shadow-md max-w-xs text-sm pointer-events-auto text-white">
        <h3 className="font-bold text-lg mb-2">Assay (Graphitic Carbon)</h3>
        <div className="flex flex-col items-center">
            <div className="w-full h-6 rounded" style={{ background: 'linear-gradient(to right, rgb(0, 255, 0), rgb(255, 0, 0))' }}></div>
            <div className="flex justify-between w-full text-xs mt-1">
                <span>{assayRange.min.toFixed(2)}</span>
                <span>{assayRange.max.toFixed(2)}</span>
            </div>
        </div>
    </div>
);

const CarbonGradeLegend = () => {
    const legendItems = [
        { color: CARBON_COLOR_MAP.LOW, label: '0.3 to 0.5' },
        { color: CARBON_COLOR_MAP.MEDIUM, label: '0.5 to 2.0' },
        { color: CARBON_COLOR_MAP.HIGH, label: '2.0 to 5.0' },
        { color: CARBON_COLOR_MAP.VERY_HIGH, label: '>5.0' },
        { color: CARBON_COLOR_MAP.DEFAULT, label: '<0.3 or Unknown' },
    ];
    return (
        <div className="absolute bottom-4 left-4 bg-gray-900 bg-opacity-80 p-3 rounded-lg shadow-md max-w-xs text-sm pointer-events-auto text-white">
            <h3 className="font-bold text-lg mb-2">Graphitic Carbon (%)</h3>
            <ul className="space-y-1">
                {legendItems.map(({ color, label }) => (
                    <li key={label} className="flex items-center">
                        <span className="inline-block w-4 h-4 mr-2" style={{ backgroundColor: color }}></span>
                        <span>{label}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const Tooltip = ({ data, position }: { data: any | null, position: { x: number, y: number } }) => {
    if (!data) return null;
    const isBlock = isBlockSegment(data);
    const title = isBlock ? `Block ID: ${data.Id}` : `Hole ID: ${data.hole_id}`;
    const properties = data.feature.properties;
    const propertyEntries = Object.entries(properties).map(([key, value]) => {
        const displayValue = typeof value === 'number' ? value.toFixed(3) : String(value);
        return <li key={key}><strong>{key}:</strong> {displayValue}</li>;
    }).filter(Boolean);
    return (
        <div className="absolute bg-gray-800 text-white p-3 rounded-md shadow-lg text-xs pointer-events-none max-w-xs" style={{ left: `${position.x + 15}px`, top: `${position.y + 15}px`, transform: 'translateZ(0)' }}>
            <p className="font-bold text-base mb-1">{title}</p>
            <ul className="list-none space-y-1">{propertyEntries}</ul>
        </div>
    );
};

const Compass = ({ rotation }: { rotation: number }) => {
    return (
        <div className="absolute top-4 left-4 bg-white bg-opacity-80 p-2 rounded-full shadow-md w-16 h-16 flex items-center justify-center pointer-events-none">
            <div className="relative w-full h-full" style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.2s ease-out' }}>
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

const CarbonReport = () => (
    <div className="absolute top-24 left-4 bg-gray-900 bg-opacity-75 p-4 rounded-lg text-white text-xs w-auto pointer-events-auto">
        <h4 className="font-bold text-base mb-2">Report</h4>
        <div className="text-gray-300 mb-3">
            <p><strong>Cut-off:</strong> Kr, GRAPHITIC_CARBON in GM_Litho: GRSC ≥ 4.00%</p>
            <p><strong>Filter:</strong> None</p>
            <p><strong>Density:</strong> 2.1 g/cm³</p>
        </div>
        <table className="w-full text-left border-collapse text-xs">
            <thead>
                <tr className="border-b border-gray-600"><th className="pb-2 font-normal" colSpan={4}>Average Value</th><th className="pb-2 font-normal text-right" colSpan={2}>Material Content</th></tr>
                <tr className="border-b border-gray-500 text-gray-400">
                    <th className="py-1 font-normal">GM_Litho</th><th className="py-1 font-normal text-right">Volume (m³)</th><th className="py-1 font-normal text-right">Density (g/cm³)</th><th className="py-1 font-normal text-right">Mass (t)</th><th className="py-1 font-normal text-right">Cg (%)</th><th className="py-1 font-normal text-right">Cg (t)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td className="py-1">GRSC</td><td className="py-1 text-right">161,326,251.10</td><td className="py-1 text-right">2.10</td><td className="py-1 text-right">338,785,127.31</td><td className="py-1 text-right">4.95</td><td className="py-1 text-right">16,763,873.20</td>
                </tr>
                <tr className="font-bold border-t border-gray-500">
                    <td className="py-2">Total</td><td className="py-2 text-right">161,326,251.10</td><td className="py-2 text-right">2.10</td><td className="py-2 text-right">338,785,127.31</td><td className="py-2 text-right">4.95</td><td className="py-2 text-right">16,763,873.20</td>
                </tr>
            </tbody>
        </table>
        <p className="text-gray-500 mt-2 text-center text-[10px]">Differences may occur in totals due to rounding.</p>
    </div>
);

const RescCalcReport = () => (
    <div className="absolute top-24 left-4 bg-gray-900 bg-opacity-75 p-4 rounded-lg text-white text-xs w-auto pointer-events-auto">
        <h4 className="font-bold text-base mb-2">Report</h4>
        <div className="text-gray-300 mb-3">
            <p><strong>Cut-off:</strong> Kr, GRAPHITIC_CARBON in GM_Litho: GRSC ≥ 4.00%</p>
            <p><strong>Filter:</strong> None</p>
            <p><strong>Density:</strong> 2.1 g/cm³</p>
        </div>
        <table className="w-full text-left border-collapse text-xs">
            <thead>
                <tr className="border-b border-gray-600"><th className="pb-2 font-normal" colSpan={4}>Average Value</th><th className="pb-2 font-normal text-right" colSpan={2}>Material Content</th></tr>
                <tr className="border-b border-gray-500 text-gray-400">
                    <th className="py-1 font-normal">RescCalc</th><th className="py-1 font-normal text-right">Volume (m³)</th><th className="py-1 font-normal text-right">Density (g/cm³)</th><th className="py-1 font-normal text-right">Mass (t)</th><th className="py-1 font-normal text-right">Cg (%)</th><th className="py-1 font-normal text-right">Cg (t)</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>Measured</td><td className="text-right">13,145,431.27</td><td className="text-right">2.10</td><td className="text-right">27,605,405.67</td><td className="text-right">5.42</td><td className="text-right">1,496,030.92</td></tr>
                <tr><td>Indicated</td><td className="text-right">119,665,518.05</td><td className="text-right">2.10</td><td className="text-right">251,297,587.90</td><td className="text-right">4.97</td><td className="text-right">12,487,906.87</td></tr>
                <tr className="font-bold border-t border-gray-500"><td>Measured + Indicated</td><td className="text-right">132,810,949.31</td><td className="text-right">2.10</td><td className="text-right">278,902,993.56</td><td className="text-right">5.01</td><td className="text-right">13,983,937.79</td></tr>
                <tr><td>Inferred</td><td className="text-right">28,515,301.78</td><td className="text-right">2.10</td><td className="text-right">59,882,133.75</td><td className="text-right">4.64</td><td className="text-right">2,779,935.40</td></tr>
            </tbody>
        </table>
        <p className="text-gray-500 mt-2 text-center text-[10px]">Differences may occur in totals due to rounding.</p>
    </div>
);

const ClassificationLegend = () => {
    const legendItems = { "Measured": "#0000ff", "Indicated": "#ff0000", "Inferred": "#00ff00" };
    return (
        <div className="absolute bottom-4 left-4 bg-gray-900 bg-opacity-80 p-3 rounded-lg shadow-md max-w-xs text-sm pointer-events-auto text-white">
            <h3 className="font-bold text-lg mb-2">Classification</h3>
            <ul className="space-y-1">
                {Object.entries(legendItems).map(([name, color]) => (
                    <li key={name} className="flex items-center">
                        <span className="inline-block w-4 h-4 mr-2" style={{ backgroundColor: color }}></span>
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

    const [drillholeData, setDrillholeData] = useState<{ lithology: DrillholeSegment[]; assay: DrillholeSegment[] } | null>(null);
    const [blockModelData, setBlockModelData] = useState<BlockSegment[] | null>(null);
    const [modelCenter, setModelCenter] = useState({ lon: 0, lat: 0 });
    const [step, setStep] = useState(0);
    const [presentationSteps, setPresentationSteps] = useState<string[]>([]);
    const [assayRange, setAssayRange] = useState({ min: 0, max: 1 });
    const [blockTransparency, setBlockTransparency] = useState(0.8);

    const [tooltipData, setTooltipData] = useState<any | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const [compassRotation, setCompassRotation] = useState(0);
    const [loadingStatus, setLoadingStatus] = useState('Idle');

    useEffect(() => {
        if (!mountRef.current) return;
        const currentMount = mountRef.current;

        const scene = new THREE.Scene();
        sceneRef.current = scene;
        scene.fog = new THREE.Fog(0x1a202c, 2000, 15000);
        scene.background = new THREE.Color(0x1a202c);

        const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 20000);
        cameraRef.current = camera;
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
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

        scene.add(new THREE.HemisphereLight(0xffffff, 0x666688, 1.2));
        const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(-1500, 2000, 1200); scene.add(key);
        const fill = new THREE.DirectionalLight(0xffffff, 0.8); fill.position.set(1500, 600, -1200); scene.add(fill);

        const gridHelper = new THREE.GridHelper(4000, 40, 0x4a5568, 0x4a5568);
        scene.add(gridHelper);

        const loadAndSetupData = async () => {
            try {
                setLoadingStatus('Fetching data...');
                const [lithologyResponse, assayResponse, blockModelResponse] = await Promise.all([
                    fetch('/lithology_data.geojson'),
                    fetch('/assay_data.geojson'),
                    fetch('/BlockModel.geojson')
                ]);

                if (!lithologyResponse.ok) throw new Error(`Failed to fetch lithology: ${lithologyResponse.statusText}`);
                if (!assayResponse.ok) throw new Error(`Failed to fetch assay: ${assayResponse.statusText}`);
                if (!blockModelResponse.ok) throw new Error(`Failed to fetch block model: ${blockModelResponse.statusText}`);

                const [lithologyGeoJson, assayGeoJson, blockModelGeoJson] = await Promise.all([
                    lithologyResponse.json(),
                    assayResponse.json(),
                    blockModelResponse.json()
                ]);
                
                setLoadingStatus('Processing data...');

                const parsedDrillholes: DrillholeSegment[] = [...lithologyGeoJson.features, ...assayGeoJson.features].flatMap((f: any) => {
                    const p = f.properties;
                    if (f.geometry.type !== 'LineString' || !f.geometry.coordinates || f.geometry.coordinates.length < 2) {
                        return [];
                    }
                    const [startCoords, endCoords] = f.geometry.coordinates;
                    if (!startCoords || startCoords.length < 3 || !endCoords || endCoords.length < 3) {
                        return [];
                    }
                    return [{
                        lon: startCoords[0], lat: startCoords[1], elevation: startCoords[2],
                        depth_from: p.depth_from, depth_to: p.depth_to, hole_id: p.hole_id,
                        lithology: p.lithology, graphitic_carbon: p.graphitic_carbon,
                        feature: f
                    }];
                });
                
                const parsedBlockModel: BlockSegment[] = blockModelGeoJson.features.map((f:any) => {
                    const p = f.properties ?? {};
                    const [lat, lon, elev] = f.geometry.coordinates;
                    return {
                        lon, lat, elevation: elev,
                        Id: String(p.Id ?? ''),
                        dX: Number(p.dX ?? 10), dY: Number(p.dY ?? 10), dZ: Number(p.dZ ?? 10),
                        "Kr, GRAPHITIC_CARBON in GM_Litho: GRSC": p["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"],
                        RescCalc: p.RescCalc,
                        feature: f
                    };
                });
                
                const allPoints: Point[] = [
                    ...parsedDrillholes.map(d => ({ lon: d.lon, lat: d.lat, elevation: d.elevation })),
                    ...parsedBlockModel.map(b => ({ lon: b.lon, lat: b.lat, elevation: b.elevation }))
                ].filter(p => p.lon != null && p.lat != null);

                let centerLon = 0, centerLat = 0, centerElev = 0;
                if (allPoints.length > 0) {
                    centerLon = allPoints.reduce((acc, p) => acc + p.lon, 0) / allPoints.length;
                    centerLat = allPoints.reduce((acc, p) => acc + p.lat, 0) / allPoints.length;
                    centerElev = allPoints.reduce((acc, p) => acc + p.elevation, 0) / allPoints.length;
                } else {
                    return;
                }

                setModelCenter({ lon: centerLon, lat: centerLat });

                const center = new THREE.Vector3(0, centerElev, 0);
                controls.target.copy(center);
                camera.position.set(center.x, center.y + 1000, center.z + 2000);
                controls.update();

                setDrillholeData({ 
                    lithology: parsedDrillholes.filter(d => d.lithology),
                    assay: parsedDrillholes.filter(d => d.graphitic_carbon !== undefined)
                });
                setBlockModelData(parsedBlockModel);

                if (assayGeoJson.features.length > 0) {
                    const assayValues = assayGeoJson.features.map((p: any) => p.properties.graphitic_carbon).filter((v: any): v is number => typeof v === 'number' && !Number.isNaN(v));
                    if (assayValues.length > 0) {
                        setAssayRange({ min: Math.min(...assayValues), max: Math.max(...assayValues) });
                    }
                }

                setPresentationSteps(['lithology_data', 'assay_data', 'block_model_carbon', 'block_model_resc']);
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
                let dataToShow: any | null = null;

                if (intersect.instanceId !== undefined && (intersect.object as THREE.InstancedMesh).userData.instanceData) {
                    dataToShow = (intersect.object as THREE.InstancedMesh).userData.instanceData[intersect.instanceId];
                } else if (intersectedObject.userData.isDrillhole || intersectedObject.userData.isBlock) {
                    dataToShow = intersectedObject.userData.sourceData;
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
        if (!scene || !drillholeData || !blockModelData || presentationSteps.length === 0) {
            return;
        }

        const objectsToRemove = scene.children.filter(obj => obj.userData.isDrillhole || obj.userData.isBlock || obj.userData.isLabel || obj.userData.isScaleBar);
        objectsToRemove.forEach(obj => {
            if(obj.parent) obj.parent.remove(obj);
            if (obj instanceof THREE.InstancedMesh || obj instanceof THREE.Mesh) {
                obj.geometry.dispose();
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        
        const project = (lon: number, lat: number): { x: number; z: number } => {
            const R = 6371e3;
            const dLon = (lon - modelCenter.lon) * (Math.PI / 180);
            const dLat = (lat - modelCenter.lat) * (Math.PI / 180);
            const x = R * dLon * Math.cos(modelCenter.lat * Math.PI / 180);
            const z = R * dLat;
            return { x, z };
        };

        if (currentStep === 'lithology_data' || currentStep === 'assay_data') {
            const dataToRender = currentStep === 'lithology_data' ? drillholeData.lithology : drillholeData.assay;
            if (!dataToRender) return;

            const groupedByColor: { [color: string]: DrillholeSegment[] } = {};
            dataToRender.forEach(feature => {
                let colorKey: string;
                if (currentStep === 'lithology_data') {
                    colorKey = colorForLithology(feature.lithology);
                } else {
                    colorKey = colorForAssay(feature.graphitic_carbon, assayRange.min, assayRange.max);
                }
                if (!groupedByColor[colorKey]) groupedByColor[colorKey] = [];
                groupedByColor[colorKey].push(feature);
            });

            Object.entries(groupedByColor).forEach(([colorHex, features]) => {
                const material = new THREE.MeshStandardMaterial({ color: colorHex });
                const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 8);
                const instancedCylinders = new THREE.InstancedMesh(cylinderGeometry, material, features.length);
                instancedCylinders.userData.isDrillhole = true;
                instancedCylinders.userData.instanceData = features;
                
                const matrix = new THREE.Matrix4();
                const position = new THREE.Vector3();
                const quaternion = new THREE.Quaternion();
                const scale = new THREE.Vector3();

                features.forEach((feature, instanceIdx) => {
                    const featureData = feature.feature;
                    if (featureData.geometry.type !== 'LineString') return;

                    const [startCoords, endCoords] = featureData.geometry.coordinates;
                    const { x: startX, z: startZ } = project(startCoords[0], startCoords[1]);
                    const startPoint = new THREE.Vector3(startX, startCoords[2], -startZ);

                    const { x: endX, z: endZ } = project(endCoords[0], endCoords[1]);
                    const endPoint = new THREE.Vector3(endX, endCoords[2], -endZ);

                    const length = startPoint.distanceTo(endPoint);
                    if (length === 0) return;

                    position.copy(startPoint).add(endPoint).divideScalar(2);
                    const direction = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
                    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
                    scale.set(15, length, 15);
                    matrix.compose(position, quaternion, scale);
                    instancedCylinders.setMatrixAt(instanceIdx, matrix);
                });

                instancedCylinders.count = features.length;
                instancedCylinders.instanceMatrix.needsUpdate = true;
                scene.add(instancedCylinders);
            });

        } else if (currentStep === 'block_model_carbon' || currentStep === 'block_model_resc') {
            if (blockModelData) {
                const groupedByColor: { [colorHex: string]: BlockSegment[] } = {};

                if (currentStep === "block_model_carbon") {
                    blockModelData.forEach(block => {
                        const colorKey = getBlockCarbonColor(block["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"]);
                        if (!groupedByColor[colorKey]) groupedByColor[colorKey] = [];
                        groupedByColor[colorKey].push(block);
                    });
                } else {
                    blockModelData.forEach(block => {
                        const colorKey = getBlockRescColor(block.RescCalc);
                        if (!groupedByColor[colorKey]) groupedByColor[colorKey] = [];
                        groupedByColor[colorKey].push(block);
                    });
                }

                Object.entries(groupedByColor).forEach(([colorHex, blocks]) => {
                    const material = new THREE.MeshStandardMaterial({ 
                        color: colorHex, 
                        transparent: true, 
                        opacity: blockTransparency 
                    });
                    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
                    const instancedBoxes = new THREE.InstancedMesh(boxGeometry, material, blocks.length);
                    instancedBoxes.userData.isBlock = true;
                    instancedBoxes.userData.instanceData = blocks;

                    const matrix = new THREE.Matrix4();
                    const position = new THREE.Vector3();
                    const quaternion = new THREE.Quaternion();
                    const scale = new THREE.Vector3();

                    blocks.forEach((block, instanceIdx) => {
                        const { x, z } = project(block.lon, block.lat);
                        position.set(x, block.elevation, -z);
                        scale.set(block.dX, block.dY, block.dZ);
                        matrix.compose(position, quaternion, scale);
                        instancedBoxes.setMatrixAt(instanceIdx, matrix);
                    });

                    instancedBoxes.count = blocks.length;
                    instancedBoxes.instanceMatrix.needsUpdate = true;
                    scene.add(instancedBoxes);
                });
            }
            
            const traceData = drillholeData.lithology;
            if (traceData) {
                const cylinderGeometry = new THREE.CylinderGeometry(2, 2, 1, 8);
                const material = new THREE.MeshStandardMaterial({ color: 0x404040 });
                const instancedTraces = new THREE.InstancedMesh(cylinderGeometry, material, traceData.length);
                instancedTraces.userData.isDrillhole = true;
                instancedTraces.userData.instanceData = traceData;

                const matrix = new THREE.Matrix4();
                const position = new THREE.Vector3();
                const quaternion = new THREE.Quaternion();
                const scale = new THREE.Vector3();

                traceData.forEach((feature, instanceIdx) => {
                    const featureData = feature.feature;
                    if (featureData.geometry.type !== 'LineString') return;

                    const [startCoords, endCoords] = featureData.geometry.coordinates;
                    const { x: startX, z: startZ } = project(startCoords[0], startCoords[1]);
                    const startPoint = new THREE.Vector3(startX, startCoords[2], -startZ);

                    const { x: endX, z: endZ } = project(endCoords[0], endCoords[1]);
                    const endPoint = new THREE.Vector3(endX, endCoords[2], -endZ);

                    const length = startPoint.distanceTo(endPoint);
                    if (length === 0) return;

                    position.copy(startPoint).add(endPoint).divideScalar(2);
                    const direction = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
                    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
                    scale.set(1, length, 1);
                    matrix.compose(position, quaternion, scale);
                    instancedTraces.setMatrixAt(instanceIdx, matrix);
                });

                instancedTraces.count = traceData.length;
                instancedTraces.instanceMatrix.needsUpdate = true;
                scene.add(instancedTraces);
            }
        }
    }, [step, presentationSteps, drillholeData, blockModelData, assayRange, blockTransparency, modelCenter]);

    const nextStep = () => setStep(s => Math.min(s + 1, presentationSteps.length - 1));
    const prevStep = () => setStep(s => Math.max(s - 1, 0));

    const isCarbonView = currentStep === 'block_model_carbon';
    const isRescCalcView = currentStep === 'block_model_resc';

    return (
        <div className="relative h-full w-full">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <Compass rotation={compassRotation} />
                {currentStep === 'lithology_data' && <LithologyLegend />}
                {currentStep === 'assay_data' && <AssayLegend assayRange={assayRange} />}
                {isCarbonView && <CarbonGradeLegend />}
                {isRescCalcView && <ClassificationLegend />}
                
                {isCarbonView && <CarbonReport />}
                {isRescCalcView && <RescCalcReport />}

                <div className="absolute top-4 right-4 z-10 flex flex-col items-end space-y-2 pointer-events-auto">
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
            
            <Tooltip data={tooltipData} position={tooltipPosition} />
        </div>
    );
};

export default GeoVision;