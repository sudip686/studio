"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Mock data for drillholes
const drillholeData = [
    { x: 50, z: 20, depth: 300, value: 0.85, type: 'assay' },
    { x: -30, z: -40, depth: 350, value: 0.3, type: 'lithology' },
    { x: 100, z: -80, depth: 280, value: 0.6, type: 'assay' },
    { x: -90, z: 70, depth: 400, value: 0.9, type: 'lithology' },
    { x: 0, z: 0, depth: 500, value: 0.5, type: 'assay' },
    { x: 150, z: 120, depth: 250, value: 0.2, type: 'assay' },
    { x: -120, z: -150, depth: 420, value: 0.7, type: 'lithology' },
];

const GeoVision = () => {
    const mountRef = useRef<HTMLDivElement>(null);

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

        // Drillholes
        drillholeData.forEach(hole => {
            const holeGeometry = new THREE.CylinderGeometry(5, 5, hole.depth, 16);
            
            let holeColor = 0x77A1AB;
            if (hole.type === 'assay') {
                const color = new THREE.Color();
                color.setHSL(0.7 * (1 - hole.value), 0.8, 0.5); // Blue (low) to Red (high)
                holeColor = color.getHex();
            } else if (hole.type === 'lithology') {
                const color = new THREE.Color();
                color.setHSL(hole.value * 0.5, 0.6, 0.6); // Varies color based on value
                holeColor = color.getHex();
            }

            const holeMaterial = new THREE.MeshStandardMaterial({ color: holeColor, roughness: 0.5 });
            const cylinder = new THREE.Mesh(holeGeometry, holeMaterial);
            
            // Note: This is a simplified positioning. For accuracy, it should sample terrain height.
            cylinder.position.set(hole.x, hole.depth / 2 - 100, hole.z); 
            cylinder.castShadow = true;
            scene.add(cylinder);
        });

        // Handle resize
        const handleResize = () => {
            if (!currentMount) return;
            camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        };
        window.addEventListener('resize', handleResize);

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

    return <div ref={mountRef} className="h-full w-full" data-ai-hint="satellite map grayscale topography" />;
};

export default GeoVision;
