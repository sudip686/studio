import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export interface GeoSceneState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

/**
 * Custom hook to initialize and synchronize a Three.js scene with a Cesium viewer.
 * 
 * @param viewer - The Cesium viewer instance.
 * @returns An object containing the Three.js scene, camera, and renderer, or null if the viewer is not ready.
 */
export function useGeoScene(viewer: any) {
  const [state, setState] = useState<GeoSceneState | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!viewer) {
        setState(null);
        return;
    }

    const Cesium = (window as any).Cesium;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    
    const canvas = viewer.scene.canvas;
    const gl = viewer.scene.context?._gl || viewer.scene.context?.gl; // Handle different Cesium versions
    
    if (!gl) {
        console.error('useGeoScene: WebGL context not found on viewer.');
        return;
    }

    const renderer = new THREE.WebGLRenderer({
      canvas,
      context: gl,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: false,
      premultipliedAlpha: false,
    });
    renderer.autoClear = false;

    // Add standard lighting
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(1, 1, 1);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const currentState = { scene, camera, renderer };
    setState(currentState);

    const postRender = () => {
        if (!mountedRef.current || !viewer.camera) return;
        
        const cesiumCamera = viewer.camera;
        const frustum = cesiumCamera.frustum;

        // Sync camera properties
        if (frustum) {
            camera.fov = Cesium ? Cesium.Math.toDegrees(frustum.fovy) : 45;
            camera.aspect = frustum.aspectRatio || (canvas.clientWidth / canvas.clientHeight);
            camera.near = frustum.near;
            camera.far = frustum.far;
        }
        
        // Use matrixWorld from viewMatrix if Cesium is available, otherwise fallback to positionWC
        if (Cesium && cesiumCamera.viewMatrix) {
            camera.matrixWorld.fromArray(cesiumCamera.viewMatrix).invert();
            camera.matrixWorld.decompose(camera.position, camera.quaternion, camera.scale);
        } else if (cesiumCamera.positionWC) {
            camera.position.set(cesiumCamera.positionWC.x, cesiumCamera.positionWC.y, cesiumCamera.positionWC.z);
            if (cesiumCamera.directionWC && cesiumCamera.upWC) {
                const target = new THREE.Vector3(
                    cesiumCamera.positionWC.x + cesiumCamera.directionWC.x,
                    cesiumCamera.positionWC.y + cesiumCamera.directionWC.y,
                    cesiumCamera.positionWC.z + cesiumCamera.directionWC.z
                );
                camera.up.set(cesiumCamera.upWC.x, cesiumCamera.upWC.y, cesiumCamera.upWC.z);
                camera.lookAt(target);
            }
        }
        camera.updateProjectionMatrix();

        // Render Three.js scene
        renderer.state.reset();
        renderer.render(scene, camera);
    };

    viewer.scene.postRender.addEventListener(postRender);

    return () => {
        mountedRef.current = false;
        viewer.scene.postRender.removeEventListener(postRender);
        
        scene.traverse((o: any) => {
            if (o.isMesh) {
                o.geometry?.dispose?.();
                if (Array.isArray(o.material)) {
                    o.material.forEach((m: any) => m.dispose?.());
                } else {
                    o.material?.dispose?.();
                }
            }
        });
        renderer.dispose();
    };
  }, [viewer]);

  return state;
}
