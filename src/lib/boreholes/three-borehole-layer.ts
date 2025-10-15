// src/lib/boreholes/three-borehole-layer.ts
import * as THREE from 'three';
import type { BoreholeSegment } from "./borehole-core";

export type BoreholeColorFnThree = (seg: BoreholeSegment) => THREE.Color;

export function createThreeBoreholeMeshes(
    segments: BoreholeSegment[], 
    colorFn: BoreholeColorFnThree,
    project: (lon: number, lat: number) => { x: number; z: number },
    options?: { radius?: number }
): THREE.Group {
    const group = new THREE.Group();
    const radius = options?.radius ?? 15.0;

    const groupedByColor: { [colorHex: string]: BoreholeSegment[] } = {};

    // Group segments by color for efficient instancing
    for (const seg of segments) {
        const color = colorFn(seg);
        const colorHex = '#' + color.getHexString();
        if (!groupedByColor[colorHex]) {
            groupedByColor[colorHex] = [];
        }
        groupedByColor[colorHex].push(seg);
    }

    Object.entries(groupedByColor).forEach(([colorHex, features]) => {
        const material = new THREE.MeshStandardMaterial({ color: colorHex });
        const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 8); // Unit cylinder
        const instancedMesh = new THREE.InstancedMesh(cylinderGeometry, material, features.length);
        instancedMesh.userData.isDrillhole = true;
        instancedMesh.userData.instanceData = features.map(f => f.props); // Attach original props
        
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        const up = new THREE.Vector3(0, 1, 0);

        features.forEach((seg, instanceIdx) => {
            const { x, z } = project(seg.lon, seg.lat);
            const startPoint = new THREE.Vector3(x, seg.top_z, -z);
            const endPoint = new THREE.Vector3(x, seg.bottom_z, -z);

            if (seg.length === 0) return;

            position.copy(startPoint).add(endPoint).divideScalar(2);
            const direction = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
            quaternion.setFromUnitVectors(up, direction);
            scale.set(radius, seg.length, radius);
            
            matrix.compose(position, quaternion, scale);
            instancedMesh.setMatrixAt(instanceIdx, matrix);
        });

        instancedMesh.instanceMatrix.needsUpdate = true;
        group.add(instancedMesh);
    });

    return group;
}
