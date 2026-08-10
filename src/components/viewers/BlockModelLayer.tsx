'use client';

import { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { useSubsurface } from '@/contexts/subsurface-context';

const CARBON_COLOR_MAP: { [key: string]: string } = { 
    LOW: '#00ff00', 
    MEDIUM: '#ffa500', 
    HIGH: '#ff0000', 
    VERY_HIGH: '#ff00ff', 
    DEFAULT: '#cccccc' 
};

const RESC_COLOR_MAP: { [key: string]: string } = {
    'Measured': '#0000ff',
    'Indicated': '#ff0000',
    'Inferred': '#00ff00',
    'DEFAULT': '#999999'
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

function getBlockRescColor(value: any): string {
    const s = String(value ?? "Unknown").trim();
    return RESC_COLOR_MAP[s] || RESC_COLOR_MAP.DEFAULT;
}

export default function BlockModelLayer({
    dataUrl = '/api/block-model',
    colorMode = 'carbon'
}: {
    dataUrl?: string;
    colorMode?: 'carbon' | 'classification' | 'json';
}) {
    const { three, showBlockModel, selectedProperty, transparency, threeClippingPlanes } = useSubsurface();
    const [data, setData] = useState<any>(null);
    const meshRefs = useRef<THREE.InstancedMesh[]>([]);

    // Fetch data
    useEffect(() => {
        let mounted = true;
        fetch(dataUrl)
            .then(res => res.json())
            .then(json => {
                if (mounted) setData(json);
            })
            .catch(err => console.error("Failed to load block model:", err));
        return () => { mounted = false; };
    }, [dataUrl]);

    // Render mesh
    useEffect(() => {
        if (!three || !data || !showBlockModel) return;

        const { scene } = three;
        const features = data.features || [];
        
        // Group blocks by color to batch draw calls
        const groups = new Map<string, any[]>();
        
        features.forEach((feature: any) => {
            const props = feature.properties;
            let colorHex = CARBON_COLOR_MAP.DEFAULT;

            if (colorMode === 'carbon') {
                 colorHex = getBlockCarbonColor(props[selectedProperty] || props["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"]);
            } else if (colorMode === 'classification') {
                 // Try common keys for classification
                 const rescKeys = ["RescCalc","rescCalc","classification","CLASS","Class"];
                 const val = rescKeys.find(k => props[k] !== undefined) ? props[rescKeys.find(k => props[k] !== undefined)!] : undefined;
                 colorHex = getBlockRescColor(val);
            } else {
                 colorHex = props.color || '#00ffff';
            }

            if (!groups.has(colorHex)) groups.set(colorHex, []);
            groups.get(colorHex)!.push(feature);
        });

        const newMeshes: THREE.InstancedMesh[] = [];
        const tmpObj = new THREE.Object3D();
        const Cesium = (window as any).Cesium;

        // Cleanup old meshes
        meshRefs.current.forEach(mesh => {
            scene.remove(mesh);
            mesh.geometry.dispose();
            (mesh.material as THREE.Material).dispose();
        });
        meshRefs.current = [];

        for (const [hex, arr] of groups.entries()) {
            const mat = new THREE.MeshPhongMaterial({ 
                color: new THREE.Color(hex), 
                transparent: transparency < 1.0, 
                opacity: transparency,
                clippingPlanes: threeClippingPlanes || [],
                clipShadows: true
            });
            const geom = new THREE.BoxGeometry(1, 1, 1);
            const mesh = new THREE.InstancedMesh(geom, mat, arr.length);

            let i = 0;
            for (const feature of arr) {
                const props = feature.properties;
                const coords = feature.geometry.coordinates; // [lon, lat, elev]
                
                // If Cesium is available, use it for conversion, otherwise mock/identity for tests
                let x = coords[0], y = coords[1], z = coords[2];
                if (Cesium) {
                    const pos = Cesium.Cartesian3.fromDegrees(coords[0], coords[1], coords[2]);
                    x = pos.x; y = pos.y; z = pos.z;
                }

                tmpObj.position.set(x, y, z);
                tmpObj.scale.set(parseFloat(props.dX), parseFloat(props.dY), parseFloat(props.dZ));
                tmpObj.updateMatrix();
                mesh.setMatrixAt(i++, tmpObj.matrix);
            }
            mesh.instanceMatrix.needsUpdate = true;
            scene.add(mesh);
            newMeshes.push(mesh);
        }

        meshRefs.current = newMeshes;

        return () => {
             newMeshes.forEach(mesh => {
                scene.remove(mesh);
                mesh.geometry.dispose();
                (mesh.material as THREE.Material).dispose();
            });
            meshRefs.current = [];
        };
    }, [three, data, showBlockModel, selectedProperty, transparency, threeClippingPlanes]);

    return null;
}

