"use client";

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Define the data structure for type safety
interface DrillholeSegment {
    x: number;
    y: number;
    z: number;
    depth_from: number;
    depth_to: number;
    hole_id: string;
    lithology?: string;
    cu_value?: number;
}

// Define the color map as a constant
const LITHOLOGY_COLOR_MAP: { [key: string]: string } = {
    "AMPHIB": "#8B4513", "BASALT": "#483D8B", "RHYOLITE": "#A0522D",
    "ANDESITE": "#CD5C5C", "DACITE": "#F08080", "SHALE": "#696969",
    "SANDSTONE": "#C0C0C0", "LIMESTONE": "#D3D3D3", "DOLOMITE": "#F5F5DC",
    "QUARTZITE": "#FFF8DC", "UNKNOWN": "#cccccc",
};

// ## Legend Component ##
const Legend = ({ colorMode }: { colorMode: 'lithology' | 'assay' }) => {
    return (
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-80 p-3 rounded-lg shadow-md max-w-xs text-sm">
            <h3 className="font-bold text-lg mb-2">{colorMode === 'lithology' ? 'Lithology' : 'Assay (Cu Value)'}</h3>
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
                        <span>Low</span>
                        <span>High</span>
                    </div>
                </div>
            )}
        </div>
    );
};


// ## Main GeoVision Component ##
const GeoVision = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const [colorMode, setColorMode] = useState<'lithology' | 'assay'>('lithology');
    const [drillholeData, setDrillholeData] = useState<{ lithology: DrillholeSegment[]; assay: DrillholeSegment[] } | null>(null);
    const [sceneCenter, setSceneCenter] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
    const [step, setStep] = useState(0);
    const [presentationSteps, setPresentationSteps] = useState<string[]>([]);
    
    // Refs for different scene layers
    const terrainRef = useRef<THREE.Mesh | null>(null);
    const geologyMapRef = useRef<THREE.Mesh | null>(null);
    const magneticMapRef = useRef<THREE.Mesh | null>(null);
    const oreBodyRef = useRef<THREE.Object3D | null>(null);

    // Function to check if a file exists
    const checkFileExists = async (url: string) => {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (e) {
            return false;
        }
    };

    // Effect for one-time scene setup
    useEffect(() => {
        if (!mountRef.current) return;
        const currentMount = mountRef.current;
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        scene.fog = new THREE.Fog(0xf0f4f5, 1000, 10000);
        scene.background = new THREE.Color(0xf0f4f5);

        const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 10000);
        camera.position.set(500, 500, 500);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        currentMount.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, 0, 0);
        controlsRef.current = controls;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(-500, 800, 500);
        scene.add(directionalLight);

        const gridHelper = new THREE.GridHelper(2000, 20);
        scene.add(gridHelper);

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
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            currentMount.removeChild(renderer.domElement);
        };
    }, []);

    // Effect to check for files and build the presentation flow
    useEffect(() => {
        const buildFlow = async () => {
            const flow: string[] = ['satellite_map'];
            const hasTopography = await checkFileExists('/topography.jpg');
            const hasGeology = await checkFileExists('/geology_map.jpg');
            const hasMagnetic = await checkFileExists('/magnetic_map.jpg');
            const hasDrillholes = await checkFileExists('/lithology_data.json');
            const hasOreBody = await checkFileExists('/ore_body.glb');

            if (hasTopography) flow.push('topography');
            if (hasGeology) flow.push('geology_map');
            if (hasMagnetic) flow.push('magnetic_map');
            if (hasDrillholes) {
                flow.push('lithology_data');
                flow.push('assay_data');
            }
            if (hasOreBody) flow.push('ore_body');

            setPresentationSteps(flow);
        };
        buildFlow();
    }, []);

    // Effect to load all data files and 3D models once
    useEffect(() => {
        const loadAllData = async () => {
            // Load drillhole data
            const [lithologyResponse, assayResponse] = await Promise.all([
                fetch('/lithology_data.json'),
                fetch('/assay_data.json')
            ]);
            const lithologyData: DrillholeSegment[] = await lithologyResponse.json();
            const assayData: DrillholeSegment[] = await assayResponse.json();

            const center = new THREE.Vector3();
            if (lithologyData.length > 0) {
                lithologyData.forEach(p => center.add(new THREE.Vector3(p.x, p.y, p.z)));
                center.divideScalar(lithologyData.length);
            }
            setSceneCenter(center);
            setDrillholeData({ lithology: lithologyData, assay: assayData });

            const textureLoader = new THREE.TextureLoader();

            // Load topography
            if (await checkFileExists('/topography.jpg')) {
                const topoTexture = textureLoader.load('/topography.jpg');
                const terrainGeom = new THREE.PlaneGeometry(2000, 2000, 256, 256);
                const terrainMat = new THREE.MeshStandardMaterial({ displacementMap: topoTexture, displacementScale: 200 });
                const terrainMesh = new THREE.Mesh(terrainGeom, terrainMat);
                terrainMesh.rotation.x = -Math.PI / 2;
                terrainRef.current = terrainMesh;
            }

            // Load 2D maps
            if (await checkFileExists('/geology_map.jpg')) {
                const geologyTexture = textureLoader.load('/geology_map.jpg');
                const geologyMat = new THREE.MeshBasicMaterial({ map: geologyTexture, transparent: true });
                const geologyMesh = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), geologyMat);
                geologyMesh.rotation.x = -Math.PI / 2;
                geologyMesh.position.y = 1;
                geologyMapRef.current = geologyMesh;
            }
            if (await checkFileExists('/magnetic_map.jpg')) {
                const magneticTexture = textureLoader.load('/magnetic_map.jpg');
                const magneticMat = new THREE.MeshBasicMaterial({ map: magneticTexture, transparent: true });
                const magneticMesh = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), magneticMat);
                magneticMesh.rotation.x = -Math.PI / 2;
                magneticMesh.position.y = 2;
                magneticMapRef.current = magneticMesh;
            }
            
            // Load 3D model
            const loader = new GLTFLoader();
            if (await checkFileExists('/ore_body.glb')) {
                loader.load('/ore_body.glb', (gltf) => {
                    oreBodyRef.current = gltf.scene;
                });
            }
        };
        loadAllData();
    }, []);

    // Effect for handling presentation steps
    useEffect(() => {
        if (!sceneRef.current) return;
        const scene = sceneRef.current;

        // Hide all layers first
        scene.children.forEach(child => {
            if (child.userData.isDrillhole || child.userData.isOreBody) {
                child.visible = false;
            }
        });
        if (terrainRef.current) scene.remove(terrainRef.current);
        if (geologyMapRef.current) scene.remove(geologyMapRef.current);
        if (magneticMapRef.current) scene.remove(magneticMapRef.current);
        if (oreBodyRef.current) scene.remove(oreBodyRef.current);
        
        // Render layers based on current step
        const currentStep = presentationSteps[step];
        const drillholesVisible = currentStep === 'lithology_data' || currentStep === 'assay_data';

        if (currentStep === 'satellite_map') {
            const satelliteTexture = new THREE.TextureLoader().load('/satellite_map.jpg');
            const satMat = new THREE.MeshStandardMaterial({ map: satelliteTexture });
            const satPlane = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), satMat);
            satPlane.rotation.x = -Math.PI / 2;
            scene.add(satPlane);
            satPlane.position.y = 0;
        }
        
        if (currentStep === 'topography' && terrainRef.current) {
            scene.add(terrainRef.current);
        }
        
        if (currentStep === 'geology_map' && geologyMapRef.current) {
            scene.add(geologyMapRef.current);
        }

        if (currentStep === 'magnetic_map' && magneticMapRef.current) {
            scene.add(magneticMapRef.current);
        }

        if (drillholesVisible && drillholeData) {
            const dataToRender = currentStep === 'lithology_data' ? drillholeData.lithology : drillholeData.assay;
            const objectsToRemove = scene.children.filter(obj => obj.userData.isDrillhole);
            objectsToRemove.forEach(obj => scene.remove(obj));

            const dataByHole = dataToRender.reduce((acc, segment) => {
                (acc[segment.hole_id] = acc[segment.hole_id] || []).push(segment);
                return acc;
            }, {} as Record<string, DrillholeSegment[]>);

            Object.values(dataByHole).forEach(segments => {
                segments.forEach(segment => {
                    const depth = segment.depth_to - segment.depth_from;
                    if (depth <= 0) return;
                    const holeGeometry = new THREE.CylinderGeometry(25, 25, depth, 12);
                    let segmentColor = new THREE.Color(LITHOLOGY_COLOR_MAP["UNKNOWN"]);

                    if (currentStep === 'lithology_data' && segment.lithology) {
                        segmentColor = new THREE.Color(LITHOLOGY_COLOR_MAP[segment.lithology] || LITHOLOGY_COLOR_MAP["UNKNOWN"]);
                    } else if (currentStep === 'assay_data' && segment.cu_value !== undefined) {
                        const normalizedValue = Math.min(Math.max(segment.cu_value, 0), 1);
                        segmentColor.setHSL((1 - normalizedValue) * 0.33, 1, 0.5);
                    }
                    const holeMaterial = new THREE.MeshStandardMaterial({ color: segmentColor });
                    const cylinder = new THREE.Mesh(holeGeometry, holeMaterial);
                    
                    cylinder.position.set(
                        segment.x - sceneCenter.x,
                        segment.z - sceneCenter.z - segment.depth_from - (depth / 2),
                        segment.y - sceneCenter.y
                    );
                    cylinder.userData.isDrillhole = true;
                    scene.add(cylinder);
                });
            });
        }
        
        if (currentStep === 'ore_body' && oreBodyRef.current) {
            oreBodyRef.current.position.set(-sceneCenter.x, -sceneCenter.z, -sceneCenter.y);
            scene.add(oreBodyRef.current);
        }

    }, [step, presentationSteps, drillholeData, sceneCenter]);

    // Navigation handlers
    const nextStep = () => setStep(s => Math.min(s + 1, presentationSteps.length - 1));
    const prevStep = () => setStep(s => Math.max(s - 1, 0));

    // UI to show when drilling data is visible
    const isDrillingDataVisible = presentationSteps[step] === 'lithology_data' || presentationSteps[step] === 'assay_data';

    return (
        <div className="relative h-full w-full">
            <div className="absolute top-4 right-4 z-10 flex flex-col items-end space-y-2">
                <div className="flex space-x-2">
                    <button onClick={prevStep} disabled={step === 0} className="p-2 rounded bg-white shadow-lg disabled:opacity-50">Previous</button>
                    <button onClick={nextStep} disabled={step === presentationSteps.length - 1} className="p-2 rounded bg-white shadow-lg disabled:opacity-50">Next</button>
                </div>
                {isDrillingDataVisible && (
                    <select 
                        onChange={(e) => setColorMode(e.target.value as 'lithology' | 'assay')} 
                        value={colorMode} 
                        className="p-2 rounded bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="lithology">Lithology</option>
                        <option value="assay">Assay (Cu)</option>
                    </select>
                )}
            </div>
            {isDrillingDataVisible && <Legend colorMode={colorMode} />}
            <div ref={mountRef} className="h-full w-full" />
        </div>
    );
};

export default GeoVision;