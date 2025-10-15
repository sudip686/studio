'use client';

import { useEffect, useRef } from 'react';
import { useCesium } from '@/contexts/cesium-context';
import { Scene, PerspectiveCamera, WebGLRenderer, DirectionalLight, AmbientLight, Plane, Vector3, Object3D, MeshPhongMaterial, Color, BoxGeometry, InstancedMesh } from 'three';

type BlockFeature = {
  geometry: { type: 'Point' | 'Polygon' | 'MultiPolygon'; coordinates: any };
  properties: { width?: number; height?: number; depth?: number; color?: string } & Record<string, any>;
};

export default function CesiumThreeBlockModel({
  kmzUrl = '/tanga_boundary.kmz',
  blockGeoJsonUrl = '/BlockModel.geojson',
  defaultBox = { x: 5, y: 5, z: 5 },   // meters
}: {
  kmzUrl?: string;
  blockGeoJsonUrl?: string;
  defaultBox?: { x: number; y: number; z: number };
}) {
  const { viewer, ready } = useCesium();
  const threeStateRef = useRef<any>(null);

  useEffect(() => {
    if (!ready || !viewer || !(window as any).Cesium) return;
    const Cesium = (window as any).Cesium as typeof import('cesium');

    let mounted = true;
    let kmzDs: any = null;

    const requestRender = () => viewer.scene.requestRender();

    const cesiumPlaneToThree = (plane: any, modelMatrix: any) => {
      const Cesium = (window as any).Cesium;
      const m = modelMatrix as any as typeof Cesium.Matrix4;
      const n = plane.normal as typeof Cesium.Cartesian3;

      const nx = m[0] * n.x + m[4] * n.y + m[8] * n.z;
      const ny = m[1] * n.x + m[5] * n.y + m[9] * n.z;
      const nz = m[2] * n.x + m[6] * n.y + m[10] * n.z;

      const origin = Cesium.Matrix4.getTranslation(m, new Cesium.Cartesian3());
      const normalDotPoint = nx * origin.x + ny * origin.y + nz * origin.z;
      const constant = -(normalDotPoint - plane.distance);

      return { nx, ny, nz, constant };
    };

    (async () => {
      try {
        // Load KMZ
        kmzDs = await Cesium.KmlDataSource.load(kmzUrl, { clampToGround: true });
        if (!mounted) return;
        await viewer.dataSources.add(kmzDs);
        await viewer.flyTo(kmzDs);

        const time = Cesium.JulianDate.now();
        const rings: any[][] = [];

        for (const e of kmzDs.entities.values) {
          const poly = (e as any).polygon;
          if (!poly?.hierarchy) continue;
          const h = poly.hierarchy.getValue(time);
          if (!h) continue;

          const collect = (node: any) => {
            const ring = (node.positions || node).slice?.() || [];
            if (ring.length >= 3) rings.push(ring);
            if (node.holes) node.holes.forEach(collect);
          };
          collect(h);
        }
        if (rings.length === 0) {
          console.warn('KMZ has no polygon rings; nothing to clip.');
          return;
        }

        const ring = rings[0];
        const center = ring.reduce(
          (acc, p) => Cesium.Cartesian3.add(acc, p, acc),
          new Cesium.Cartesian3()
        );
        Cesium.Cartesian3.multiplyByScalar(center, 1 / ring.length, center);

        const enu = Cesium.Transforms.eastNorthUpToFixedFrame(center);
        const planes: any[] = [];

        for (let i = 0; i < ring.length; i++) {
          const a = ring[i];
          const b = ring[(i + 1) % ring.length];

          const mid = Cesium.Cartesian3.multiplyByScalar(
            Cesium.Cartesian3.add(a, b, new Cesium.Cartesian3()),
            0.5,
            new Cesium.Cartesian3()
          );
          const up = Cesium.Cartesian3.normalize(Cesium.Cartesian3.clone(mid), new Cesium.Cartesian3());
          const right = Cesium.Cartesian3.normalize(
            Cesium.Cartesian3.subtract(b, mid, new Cesium.Cartesian3()),
            new Cesium.Cartesian3()
          );
          let normal = Cesium.Cartesian3.cross(right, up, new Cesium.Cartesian3());
          normal = Cesium.Cartesian3.normalize(normal, normal);
          normal = Cesium.Cartesian3.negate(normal, normal);

          const originPlane = new Cesium.Plane(normal, 0.0);
          const distance = Cesium.Plane.getPointDistance(originPlane, mid);

          planes.push(new Cesium.ClippingPlane(normal, distance));
        }

        const globe = viewer.scene.globe;
        const prevBack = globe.backFaceCulling;
        const prevSkirts = globe.showSkirts;

        globe.backFaceCulling = false;
        globe.showSkirts = false;
        globe.clippingPlanes = new Cesium.ClippingPlaneCollection({
          planes,
          unionClippingRegions: false,
          edgeWidth: 1.0,
          edgeColor: Cesium.Color.WHITE,
          enabled: true,
          modelMatrix: enu,
        });

        // ---------- THREE overlay ----------
        const scene = new Scene();
        const camera = new PerspectiveCamera();
        const renderer = new WebGLRenderer({
          canvas: viewer.canvas,
          context: (viewer.scene as any).context._gl,
        });
        renderer.autoClear = false;
        renderer.localClippingEnabled = true;

        const light = new DirectionalLight(0xffffff, 0.8);
        light.position.set(1, 1, 1);
        scene.add(light);
        scene.add(new AmbientLight(0xffffff, 0.4));

        const threePlanes = planes.map((p) => cesiumPlaneToThree(p, enu)).map((wp) => {
          return new Plane(new Vector3(wp.nx, wp.ny, wp.nz), wp.constant);
        });

        // ---------- Block Model ----------
        const resp = await fetch(blockGeoJsonUrl);
        const gj = await resp.json();
        const feats: BlockFeature[] = gj.features || [];

        const groups = new Map<string, BlockFeature[]>();
        for (const f of feats) {
          const color = f.properties?.color || '#00ffff';
          if (!groups.has(color)) groups.set(color, []);
          groups.get(color)!.push(f);
        }

        const tmpObj = new Object3D();

        for (const [hex, arr] of groups.entries()) {
          const mat = new MeshPhongMaterial({
            color: new Color(hex),
            clippingPlanes: threePlanes,
            clipShadows: true,
            transparent: true,
            opacity: 0.95,
            depthWrite: true,
          });

          const geom = new BoxGeometry(1, 1, 1);
          const mesh = new InstancedMesh(geom, mat, arr.length);

          let i = 0;
          for (const f of arr) {
            let lon: number, lat: number, h: number;
            if (f.geometry.type === 'Point') {
              [lon, lat, h] = f.geometry.coordinates as [number, number, number];
            } else {
              continue;
            }

            const w = f.properties.width ?? defaultBox.x;
            const d = f.properties.depth ?? defaultBox.y;
            const z = f.properties.height ?? defaultBox.z;

            const pos = Cesium.Cartesian3.fromDegrees(lon, lat, h);
            tmpObj.position.set(pos.x, pos.y, pos.z);
            tmpObj.scale.set(w, z, d);

            tmpObj.rotation.set(0, 0, 0);
            tmpObj.updateMatrix();
            mesh.setMatrixAt(i++, tmpObj.matrix);
          }
          mesh.instanceMatrix.needsUpdate = true;
          scene.add(mesh);
        }

        threeStateRef.current = { renderer, scene, camera };

        // ---------- Sync Three camera + render ----------
        const tmpV = new Vector3();
        const postRender = () => {
          if (!threeStateRef.current) return;

          const cv = viewer.camera;
          const frustum = cv.frustum as any;
          const width = viewer.canvas.clientWidth;
          const height = viewer.canvas.clientHeight;

          const fov = Cesium.Math.toDegrees(frustum.fovy);
          threeStateRef.current.camera.fov = fov;
          threeStateRef.current.camera.aspect = width / height;
          threeStateRef.current.camera.near = frustum.near;
          threeStateRef.current.camera.far = frustum.far;

          const pos = cv.positionWC;
          const dir = cv.directionWC;
          const up = cv.upWC;

          threeStateRef.current.camera.position.set(pos.x, pos.y, pos.z);
          tmpV.set(pos.x + dir.x, pos.y + dir.y, pos.z + dir.z);
          threeStateRef.current.camera.up.set(up.x, up.y, up.z);
          threeStateRef.current.camera.lookAt(tmpV);
          threeStateRef.current.camera.updateProjectionMatrix();

          threeStateRef.current.renderer.state.reset();
          threeStateRef.current.renderer.render(threeStateRef.current.scene, threeStateRef.current.camera);
        };

        viewer.scene.postRender.addEventListener(postRender);

        requestRender();

        return () => {
          viewer.scene.postRender.removeEventListener(postRender);
          if (globe.clippingPlanes) {
            globe.clippingPlanes.removeAll();
            globe.clippingPlanes = undefined as any;
          }
          globe.backFaceCulling = prevBack;
          globe.showSkirts = prevSkirts;

          if (kmzDs) viewer.dataSources.remove(kmzDs, true);
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
      } catch (err) {
        console.error('CesiumThreeBlockModel error:', err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [ready, viewer, kmzUrl, blockGeoJsonUrl, defaultBox]);

  return null;
}
