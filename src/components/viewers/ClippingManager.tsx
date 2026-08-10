'use client';

import { useEffect } from 'react';
import * as THREE from 'three';
import { useCesium } from '@/contexts/cesium-context';
import { useSubsurface } from '@/contexts/subsurface-context';

export default function ClippingManager() {
    const { viewer, ready } = useCesium();
    const { clippingMode, setClippingPlanes, clippingRadius } = useSubsurface();

    useEffect(() => {
        if (!viewer || !ready || !clippingMode) return;
        const Cesium = (window as any).Cesium;
        const globe = viewer.scene.globe;

        const cleanup = () => {
            if (globe.clippingPlanes) {
                globe.clippingPlanes.enabled = false;
                globe.clippingPlanes.removeAll();
                globe.clippingPlanes = undefined as any;
            }
            setClippingPlanes([], []);
        };

        if (clippingMode === 'none') {
            cleanup();
            return;
        }

        const setupClipping = async () => {
            let planes: any[] = [];
            let modelMatrix: any;

            if (clippingMode === 'box') {
                const position = Cesium.Cartesian3.fromDegrees(38.78, -4.8, 0);
                const distance = 40000.0;
                planes = [
                    new Cesium.ClippingPlane(new Cesium.Cartesian3(1.0, 0.0, 0.0), distance),
                    new Cesium.ClippingPlane(new Cesium.Cartesian3(-1.0, 0.0, 0.0), distance),
                    new Cesium.ClippingPlane(new Cesium.Cartesian3(0.0, 1.0, 0.0), distance),
                    new Cesium.ClippingPlane(new Cesium.Cartesian3(0.0, -1.0, 0.0), distance),
                ];
                modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position);
            } else if (clippingMode === 'elevation') {
                // Horizontal plane at a specific elevation (clippingRadius used as height for now)
                const height = clippingRadius; // Re-purposing radius as height for elevation mode
                planes = [
                    new Cesium.ClippingPlane(new Cesium.Cartesian3(0.0, 0.0, -1.0), height)
                ];
                modelMatrix = Cesium.Matrix4.IDENTITY;
            } else if (clippingMode === 'polygon') {
                // Try to find KML data source from viewer
                const ds = viewer.dataSources.get(0); // Assumes first DS is our boundary
                if (!ds || !ds.entities) return;

                const time = Cesium.JulianDate.now();
                const rings: any[][] = [];
                for (const e of ds.entities.values) {
                    const poly = e.polygon;
                    if (!poly || !poly.hierarchy) continue;
                    const h = poly.hierarchy.getValue(time);
                    if (!h) continue;
                    const collect = (node: any) => {
                        const ring = (node.positions || node).slice?.() || [];
                        if (ring.length >= 3) rings.push(ring);
                        if (node.holes) node.holes.forEach(collect);
                    };
                    collect(h);
                }
                if (rings.length === 0) return;

                const ring = rings[0];
                const center = ring.reduce((acc, p) => Cesium.Cartesian3.add(acc, p, acc), new Cesium.Cartesian3());
                Cesium.Cartesian3.multiplyByScalar(center, 1 / ring.length, center);
                modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(center);

                for (let i = 0; i < ring.length; i++) {
                    const a = ring[i];
                    const b = ring[(i + 1) % ring.length];
                    const mid = Cesium.Cartesian3.multiplyByScalar(Cesium.Cartesian3.add(a, b, new Cesium.Cartesian3()), 0.5, new Cesium.Cartesian3());
                    const up = Cesium.Cartesian3.normalize(Cesium.Cartesian3.clone(mid), new Cesium.Cartesian3());
                    const right = Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(b, mid, new Cesium.Cartesian3()), new Cesium.Cartesian3());
                    let normal = Cesium.Cartesian3.cross(right, up, new Cesium.Cartesian3());
                    normal = Cesium.Cartesian3.normalize(normal, normal);
                    normal = Cesium.Cartesian3.negate(normal, normal);
                    const originPlane = new Cesium.Plane(normal, 0.0);
                    const distance = Cesium.Plane.getPointDistance(originPlane, mid);
                    planes.push(new Cesium.ClippingPlane(normal, distance));
                }
            }

            if (planes.length > 0) {
                globe.clippingPlanes = new Cesium.ClippingPlaneCollection({
                    modelMatrix: modelMatrix,
                    planes: planes,
                    unionClippingRegions: clippingMode === 'box',
                    edgeWidth: 0.35,
                    edgeColor: Cesium.Color.WHITE.withAlpha(0.45),
                    enabled: true,
                });

                const threePlanes = planes.map(p => {
                    const normal = new THREE.Vector3(p.normal.x, p.normal.y, p.normal.z);
                    const m = new THREE.Matrix4().fromArray(Cesium.Matrix4.toArray(modelMatrix));
                    const normalWorld = normal.clone().applyMatrix4(new THREE.Matrix4().extractRotation(m)).normalize();
                    const pointLocal = normal.clone().multiplyScalar(p.distance);
                    const pointWorld = pointLocal.applyMatrix4(m);
                    const constant = -normalWorld.dot(pointWorld);
                    return new THREE.Plane(normalWorld, constant);
                });

                setClippingPlanes(planes, threePlanes);
            }
        };

        setupClipping();

        return cleanup;
    }, [viewer, ready, clippingMode, setClippingPlanes]);

    return null;
}



