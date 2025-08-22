"use client";

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const GeoVision = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const [colorMode, setColorMode] = useState<'lithology' | 'assay'>('lithology'); // State for color mode

    useEffect(() => {
        if (!mountRef.current) return;

        const currentMount = mountRef.current;

        // Scene setup
        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0xf0f4f5, 1000, 2000);
        scene.background = new THREE.Color(0xf0f4f5);

        // Camera setup
        const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 2000);
        camera.position.set(0, 400, 500);

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        currentMount.appendChild(renderer.domElement);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2.1;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(-200, 300, 200);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 1500;
        scene.add(directionalLight);

        // Texture loading
        const textureLoader = new THREE.TextureLoader();
        const displacementMap = textureLoader.load('https://placehold.co/1024x1024.png');
        const colorMap = textureLoader.load('https://placehold.co/1024x1024.png');

        // Terrain
        const geometry = new THREE.PlaneGeometry(1000, 1000, 250, 250);
        const material = new THREE.MeshStandardMaterial({
            map: colorMap,
            displacementMap: displacementMap,
            displacementScale: 400,
            roughness: 0.9,
            metalness: 0.1,
        });

        const terrain = new THREE.Mesh(geometry, material);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        scene.add(terrain);

        // Function to render drillholes
        const renderDrillholes = async () => {
            // Clear existing drillholes
            scene.children.forEach(object => {
                if (object.userData.isDrillhole) {
                    scene.remove(object);
                    if (object instanceof THREE.Mesh) {
                        object.geometry.dispose();
                        if (Array.isArray(object.material)) {
                            object.material.forEach(mat => mat.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                }
            });

            try {
                const lithologyResponse = await fetch('/lithology_data.json');
                const lithologyData = await lithologyResponse.json();

                const assayResponse = await fetch('/assay_data.json');
                const assayData = await assayResponse.json();

                // Group data by hole_id
                const lithologyByHole = lithologyData.reduce((acc: any, segment: any) => {
                    (acc[segment.hole_id] = acc[segment.hole_id] || []).push(segment);
                    return acc;
                }, {});

                const assayByHole = assayData.reduce((acc: any, segment: any) => {
                    (acc[segment.hole_id] = acc[segment.hole_id] || []).push(segment);
                    return acc;
                }, {});

                const holeIds = Object.keys(lithologyByHole); // Assuming lithology data has all holes

                holeIds.forEach(holeId => {
                    const lithologySegments = lithologyByHole[holeId] || [];
                    const assaySegments = assayByHole[holeId] || [];

                    // Use lithology segments as the base, assuming they define the overall structure
                    lithologySegments.forEach((segment: any) => {
                        const depth = segment.depth_to - segment.depth_from;
                        if (depth <= 0) return; // Skip segments with no thickness

                        const holeGeometry = new THREE.CylinderGeometry(1, 1, depth, 16);

                        let segmentColor = 0xcccccc; // Default color

                        if (colorMode === 'lithology') {
                            // Dummy color mapping for lithology
                            const lithologyColorMap: { [key: string]: number } = {
                                "AMPHIB": 0x8B4513, // SaddleBrown
                                "BASALT": 0x483D8B, // DarkSlateBlue
                                "RHYOLITE": 0xA0522D, // Sienna
                                "ANDESITE": 0xCD5C5C, // IndianRed
                                "DACITE": 0xF08080, // LightCoral
                                "SHALE": 0x696969, // DimGrey
                                "SANDSTONE": 0xC0C0C0, // Silver
                                "LIMESTONE": 0xD3D3D3, // LightGrey
                                "DOLOMITE": 0xF5F5DC, // Beige
                                "QUARTZITE": 0xFFF8DC, // Cornsilk
                                // Add more lithology types and colors here
                            };
                            segmentColor = lithologyColorMap[segment.lithology] || 0xcccccc; // Default grey if not found

                        } else if (colorMode === 'assay') {
                            // Find the corresponding assay segment
                            const correspondingAssay = assaySegments.find((assaySeg: any) =>
                                assaySeg.depth_from >= segment.depth_from && assaySeg.depth_to <= segment.depth_to
                            );

                            if (correspondingAssay) {
                                // Simple color scale based on cu_value (0 to 1)
                                const cuValue = correspondingAssay.cu_value || 0;
                                const normalizedValue = Math.min(Math.max(cuValue, 0), 1); // Clamp between 0 and 1
                                const color = new THREE.Color();
                                color.setHSL((1 - normalizedValue) * 0.6, 1, 0.5); // Green (low) to Red (high)
                                segmentColor = color.getHex();
                            } else {
                                // If no assay data for the segment, use a default color
                                segmentColor = 0x808080; // Grey
                            }
                        }

                        const holeMaterial = new THREE.MeshStandardMaterial({ color: segmentColor, roughness: 0.5 });
                        const cylinder = new THREE.Mesh(holeGeometry, holeMaterial);

                        // Position the segment based on its start depth and the hole's origin
                        cylinder.position.set(
                            segment.x,
                            segment.z - segment.depth_from - (depth / 2), // Adjust z to be vertical
                            segment.y // Use y for the other horizontal axis
                        );
                        cylinder.rotation.x = Math.PI / 2; // Orient cylinder vertically
                        cylinder.castShadow = true;
                        cylinder.userData.isDrillhole = true; // Mark as drillhole for easy removal
                        scene.add(cylinder);
                    });
                });

            } catch (error) {
                console.error('Error loading or rendering drillhole data:', error);
            }
        };
    
    // Re-render drillholes when colorMode changes
    useEffect(() => { renderDrillholes() }, [colorMode]);

        // Handle resize



        // Initial render of drillholes
        renderDrillholes();

        // Re-render drillholes when colorMode changes
        useEffect(() => { renderDrillholes() }, [colorMode]);
        window.addEventListener('resize', handleResize);

    // Handle resize
    const handleResize = () => {
        if (!currentMount) return;
        camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };

        // Animation loop
        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            if (currentMount) {
              currentMount.removeChild(renderer.domElement);
            }
            renderer.dispose();
            scene.traverse(object => {
                if (object instanceof THREE.Mesh) {
                    object.geometry.dispose();
                    if (Array.isArray(object.material)) {
                        object.material.forEach(mat => mat.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            displacementMap.dispose();
            colorMap.dispose();
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <>
            <div className="absolute top-4 right-4 z-10">
                <select onChange={(e) => setColorMode(e.target.value as 'lithology' | 'assay')} value={colorMode} className="p-2 rounded">
                    <option value="lithology">Lithology</option>
                    <option value="assay">Assay (Cu)</option>
                </select>
            </div>
            <div ref={mountRef} className="h-full w-full" data-ai-hint="satellite map grayscale topography" />
        </>
    );
};

export default GeoVision;
