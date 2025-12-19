'use client';

import { useEffect, useRef } from 'react';
import { useCesium } from '@/contexts/cesium-context';
import { useDataCache } from '@/lib/data-cache';
import * as THREE from 'three';

// Color function for Carbon Block Model
const CARBON_COLOR_MAP: { [key: string]: string } = { LOW: '#00ff00', MEDIUM: '#ffa500', HIGH: '#ff0000', VERY_HIGH: '#ff00ff', DEFAULT: '#cccccc' };
function getBlockCarbonColor(value: any): string {
    const v = Number(value);
    if (!Number.isFinite(v)) return CARBON_COLOR_MAP.DEFAULT;
    if (v > 5.0) return CARBON_COLOR_MAP.VERY_HIGH; if (v > 2.0) return CARBON_COLOR_MAP.HIGH;
    if (v > 0.5) return CARBON_COLOR_MAP.MEDIUM; if (v > 0.3) return CARBON_COLOR_MAP.LOW;
    return CARBON_COLOR_MAP.DEFAULT;
}

export default function BlockModelClipViewer() {
  const { viewer, ready } = useCesium();
  const { blockModelData } = useDataCache();
  const threeStateRef = useRef<any>(null);

  useEffect(() => {
    if (!ready || !viewer || !blockModelData || blockModelData.length === 0) return;
    const Cesium = (window as any).Cesium as typeof import('cesium');

    let mounted = true;
    const requestRender = () => viewer.scene.requestRender();

    // 1. Define the clipping region (similar to Grand Canyon example)
    const position = Cesium.Cartesian3.fromDegrees(38.78, -4.8, 0);
    const distance = 40000.0; // Radius of the clipping sphere in meters
    const boundingSphere = new Cesium.BoundingSphere(position, distance);

    const globe = viewer.scene.globe;
    const prevBackFace = globe.backFaceCulling;
    const prevSkirts = globe.showSkirts;

    globe.backFaceCulling = false;
    globe.showSkirts = false;
    globe.clippingPlanes = new Cesium.ClippingPlaneCollection({
        modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(position),
        planes: [
            new Cesium.ClippingPlane(new Cesium.Cartesian3(1.0, 0.0, 0.0), distance),
            new Cesium.ClippingPlane(new Cesium.Cartesian3(-1.0, 0.0, 0.0), distance),
            new Cesium.ClippingPlane(new Cesium.Cartesian3(0.0, 1.0, 0.0), distance),
            new Cesium.ClippingPlane(new Cesium.Cartesian3(0.0, -1.0, 0.0), distance),
        ],
        unionClippingRegions: true, // This creates the "isolated" puck effect
        edgeWidth: 1.0,
        edgeColor: Cesium.Color.WHITE,
        enabled: true,
    });

    // 2. Set up Three.js scene to render inside the clipped area
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    const canvas = viewer?.scene?.canvas as HTMLCanvasElement | undefined;
    const gl = (viewer?.scene as any)?.context?._gl;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      context: gl,
      alpha: true, // Ensure canvas is transparent
      antialias: true,
      preserveDrawingBuffer: false,
      premultipliedAlpha: false,
    });
    renderer.autoClear = false;

    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(1, 1, 1);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    // 3. Create InstancedMesh for the Block Model, colored by Carbon content
    const groups = new Map<string, any[]>();
    for (const block of blockModelData) {
        const colorHex = getBlockCarbonColor(block["Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"]);
        if (!groups.has(colorHex)) groups.set(colorHex, []);
        groups.get(colorHex)!.push(block);
    }

    const tmpObj = new THREE.Object3D();
    for (const [hex, arr] of groups.entries()) {
        const mat = new THREE.MeshPhongMaterial({ color: new THREE.Color(hex), transparent: true, opacity: 0.8 });
        const geom = new THREE.BoxGeometry(1, 1, 1);
        const mesh = new THREE.InstancedMesh(geom, mat, arr.length);

        let i = 0;
        for (const block of arr) {
            const pos = Cesium.Cartesian3.fromDegrees(block.lon, block.lat, block.elevation);
            tmpObj.position.set(pos.x, pos.y, pos.z);
            tmpObj.scale.set(block.dX, block.dY, block.dZ);
            tmpObj.updateMatrix();
            mesh.setMatrixAt(i++, tmpObj.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
        scene.add(mesh);
    }

    threeStateRef.current = { renderer, scene, camera };

    // 4. Synchronize Three.js camera with Cesium camera and render
    const postRender = () => {
        if (!threeStateRef.current || !mounted) return;
        const { renderer, scene, camera } = threeStateRef.current;
        const cesiumCamera = viewer.camera;

        // Sync camera properties
        camera.fov = Cesium.Math.toDegrees(cesiumCamera.frustum.fovy);
        camera.aspect = cesiumCamera.frustum.aspectRatio;
        camera.near = cesiumCamera.frustum.near;
        camera.far = cesiumCamera.frustum.far;
        camera.matrixWorld.fromArray(cesiumCamera.viewMatrix).invert();
        camera.matrixWorld.decompose(camera.position, camera.quaternion, camera.scale);

        // Render Three.js scene
        renderer.state.reset();
        renderer.render(scene, camera);
    };
    viewer.scene.postRender.addEventListener(postRender);

    // 5. Fly camera to the clipped region
    viewer.camera.flyToBoundingSphere(boundingSphere, {
        duration: 2.0,
        offset: new Cesium.HeadingPitchRange(0.5, -0.5, boundingSphere.radius * 2.0)
    });
    requestRender();

    // 6. Cleanup
    return () => {
        mounted = false;
        viewer.scene.postRender.removeEventListener(postRender);
        if (globe.clippingPlanes) {
            globe.clippingPlanes.enabled = false;
            globe.clippingPlanes.removeAll();
        }
        globe.backFaceCulling = prevBackFace;
        globe.showSkirts = prevSkirts;
        if (threeStateRef.current) {
            threeStateRef.current.scene.traverse((o: any) => {
                if (o.isMesh) {
                    o.geometry?.dispose?.();
                    o.material?.dispose?.();
                }
            });
            threeStateRef.current = null;
        }
        requestRender();
    };
  }, [ready, viewer, blockModelData]);

  return null; // This component only affects the Cesium canvas, it doesn't render any DOM elements itself
}
