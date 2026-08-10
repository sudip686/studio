'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThreeScene } from '@/contexts/three-scene-context';
import { projectLonLat } from '@/lib/utils/three-helpers';
import { sampleElevationAtLonLat } from '@/lib/terrain/dem-sampler';

type OsmEnvironmentLayerProps = {
  modelCenter?: { lon: number; lat: number };
  meshVisible?: boolean;
};

type GeoJsonFeature = {
  type: 'Feature';
  geometry: { type: string; coordinates: any };
  properties?: Record<string, any>;
};

type GeoJsonFC = { type: 'FeatureCollection'; features: GeoJsonFeature[] };

async function loadGeoJson(url: string): Promise<GeoJsonFC> {
  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) {
    throw new Error(`Failed to load ${url}: ${resp.status} ${resp.statusText}`);
  }
  return (await resp.json()) as GeoJsonFC;
}

function makeLabelSprite(text: string) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const padX = 14;
  const padY = 8;
  const fontSize = 30;
  ctx.font = `700 ${fontSize}px "Segoe UI", sans-serif`;
  const width = Math.ceil(ctx.measureText(text).width) + padX * 2;
  const height = fontSize + padY * 2;
  canvas.width = width;
  canvas.height = height;

  const ctx2 = canvas.getContext('2d');
  if (!ctx2) return null;
  ctx2.font = `700 ${fontSize}px "Segoe UI", sans-serif`;
  ctx2.fillStyle = 'rgba(0, 0, 0, 0.88)';
  ctx2.strokeStyle = 'rgba(255,255,255,0.52)';
  ctx2.lineWidth = 2;
  const r = 12;
  ctx2.beginPath();
  ctx2.moveTo(r, 0);
  ctx2.lineTo(width - r, 0);
  ctx2.quadraticCurveTo(width, 0, width, r);
  ctx2.lineTo(width, height - r);
  ctx2.quadraticCurveTo(width, height, width - r, height);
  ctx2.lineTo(r, height);
  ctx2.quadraticCurveTo(0, height, 0, height - r);
  ctx2.lineTo(0, r);
  ctx2.quadraticCurveTo(0, 0, r, 0);
  ctx2.closePath();
  ctx2.fill();
  ctx2.stroke();
  ctx2.fillStyle = '#ffffff';
  ctx2.textBaseline = 'middle';
  ctx2.fillText(text, padX, height * 0.54);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  const scale = 185;
  sprite.scale.set((width / height) * scale, scale, 1);
  return sprite;
}

function makePoiMarker(kind: string) {
  const color = kind === 'place' ? '#ffffff' : '#f2f2f2';
  const geom = new THREE.SphereGeometry(3.6, 14, 14);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.96,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.renderOrder = 34;
  return mesh;
}

export default function OsmEnvironmentLayer({
  modelCenter,
  meshVisible = true,
}: OsmEnvironmentLayerProps) {
  const { dynamicGroup, registerTooltipTarget, unregisterTooltipTarget } = useThreeScene();
  const groupRef = useRef<THREE.Group | null>(null);
  const tooltipTargetsRef = useRef<THREE.Object3D[]>([]);

  useEffect(() => {
    if (!dynamicGroup || !modelCenter || !meshVisible) return;

    let disposed = false;
    const group = new THREE.Group();
    group.name = 'OsmEnvironmentLayer';
    groupRef.current = group;
    dynamicGroup.add(group);

    const elevationCache = new Map<string, number>();
    const sampleElev = async (lon: number, lat: number) => {
      const key = `${lon.toFixed(6)}_${lat.toFixed(6)}`;
      const cached = elevationCache.get(key);
      if (cached !== undefined) return cached;
      const elev = (await sampleElevationAtLonLat(lon, lat)) ?? 0;
      elevationCache.set(key, elev);
      return elev;
    };

    const addRoads = async (roads: GeoJsonFC) => {
      for (const f of roads.features) {
        if (f.geometry.type !== 'LineString') continue;
        const coords = (f.geometry.coordinates as number[][]) || [];
        if (coords.length < 2) continue;
        const pts: THREE.Vector3[] = [];
        for (const c of coords) {
          const lon = Number(c[0]);
          const lat = Number(c[1]);
          if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
          const elev = await sampleElev(lon, lat);
          const { x, z } = projectLonLat(lon, lat, modelCenter);
          pts.push(new THREE.Vector3(x, elev + 0.4, -z));
        }
        if (pts.length < 2) continue;
        const hw = String(f.properties?.highway || '');
        const width = hw === 'primary' || hw === 'trunk' ? 14 : hw === 'secondary' ? 11 : hw === 'tertiary' ? 9 : 7;
        const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2);
        const geom = new THREE.TubeGeometry(curve, Math.max(8, pts.length * 2), width * 0.5, 8, false);
        const mat = new THREE.MeshStandardMaterial({
          color: '#6c7380',
          emissive: '#9099a8',
          emissiveIntensity: 0.08,
          roughness: 0.9,
          metalness: 0.0,
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.receiveShadow = false;
        mesh.castShadow = false;
        mesh.renderOrder = 18;
        mesh.material.depthTest = false;
        mesh.material.depthWrite = false;
        group.add(mesh);
        registerTooltipTarget(mesh, () => {
          const name = f.properties?.name ? ` - ${String(f.properties.name)}` : '';
          const type = f.properties?.highway ? String(f.properties.highway) : 'road';
          return `<b>Road</b>${name}<br/><b>Type:</b> ${type}`;
        });
        tooltipTargetsRef.current.push(mesh);

        // Soft glow shell to keep roads visible over terrain texture.
        const glowGeom = new THREE.TubeGeometry(curve, Math.max(8, pts.length * 2), width * 0.62, 8, false);
        const glowMat = new THREE.MeshBasicMaterial({
          color: '#cfd6e1',
          transparent: true,
          opacity: 0.14,
          depthWrite: false,
        });
        const glow = new THREE.Mesh(glowGeom, glowMat);
        glow.renderOrder = 19;
        glow.material.depthTest = false;
        group.add(glow);
      }
    };

    const addBuildings = async (buildings: GeoJsonFC) => {
      for (const f of buildings.features) {
        if (f.geometry.type !== 'Polygon') continue;
        const rings = (f.geometry.coordinates as number[][][]) || [];
        const ring = rings[0] || [];
        if (ring.length < 4) continue;

        const shapePts: Array<{ x: number; y: number }> = [];
        let elev = 0;
        let count = 0;
        for (const c of ring.slice(0, -1)) {
          const lon = Number(c[0]);
          const lat = Number(c[1]);
          if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
          const { x, z } = projectLonLat(lon, lat, modelCenter);
          shapePts.push({ x, y: -z });
          elev += await sampleElev(lon, lat);
          count += 1;
        }
        if (shapePts.length < 3) continue;
        const baseElev = count > 0 ? elev / count : 0;
        const levels = Number(f.properties?.levels);
        const explicitHeight = Number(f.properties?.height);
        const h = Number.isFinite(explicitHeight) && explicitHeight > 2 ? explicitHeight * 1.55 : Number.isFinite(levels) && levels > 0 ? levels * 5.4 : 24 + Math.random() * 20;

        const shape = new THREE.Shape();
        shape.moveTo(shapePts[0].x, shapePts[0].y);
        for (let i = 1; i < shapePts.length; i += 1) {
          shape.lineTo(shapePts[i].x, shapePts[i].y);
        }
        shape.closePath();
        const geom = new THREE.ExtrudeGeometry(shape, {
          depth: h,
          bevelEnabled: false,
          steps: 1,
          curveSegments: 1,
        });
        geom.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshStandardMaterial({
          color: '#f6f6f4',
          emissive: '#222222',
          emissiveIntensity: 0.05,
          roughness: 0.83,
          metalness: 0.03,
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.y = baseElev + 1.2;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.renderOrder = 16;
        mesh.material.depthTest = false;
        mesh.material.depthWrite = false;
        group.add(mesh);
        registerTooltipTarget(mesh, () => {
          const name = f.properties?.name ? String(f.properties.name) : 'Unnamed';
          const lv = f.properties?.levels ? String(f.properties.levels) : 'n/a';
          return `<b>Building</b><br/><b>Name:</b> ${name}<br/><b>Levels:</b> ${lv}`;
        });
        tooltipTargetsRef.current.push(mesh);

        // Bright roof cap for quick building readability.
        const roofShape = new THREE.Shape();
        roofShape.moveTo(shapePts[0].x, shapePts[0].y);
        for (let i = 1; i < shapePts.length; i += 1) {
          roofShape.lineTo(shapePts[i].x, shapePts[i].y);
        }
        roofShape.closePath();
        const roofGeom = new THREE.ShapeGeometry(roofShape);
        roofGeom.rotateX(-Math.PI / 2);
        const roofMat = new THREE.MeshBasicMaterial({
          color: '#ffffff',
          transparent: true,
          opacity: 0.94,
          depthTest: false,
          depthWrite: false,
        });
        const roof = new THREE.Mesh(roofGeom, roofMat);
        roof.position.y = mesh.position.y + h + 0.45;
        roof.renderOrder = 18;
        group.add(roof);

        const edgeGeom = new THREE.EdgesGeometry(geom, 18);
        const edgeMat = new THREE.LineBasicMaterial({
          color: '#2f2f2f',
          transparent: true,
          opacity: 0.88,
          depthWrite: false,
        });
        const edges = new THREE.LineSegments(edgeGeom, edgeMat);
        edges.position.copy(mesh.position);
        edges.renderOrder = 17;
        edges.material.depthTest = false;
        group.add(edges);
      }
    };

    const addTrees = async (trees: GeoJsonFC) => {
      const points = trees.features.filter((f) => f.geometry.type === 'Point');
      if (!points.length) return;
      const cap = Math.min(points.length * 12, 9000);
      const trunkGeom = new THREE.CylinderGeometry(0.18, 0.24, 2.2, 6);
      const canopyGeom = new THREE.SphereGeometry(3.6, 12, 10);
      const patchGeom = new THREE.CircleGeometry(11, 14);
      const trunkMat = new THREE.MeshStandardMaterial({ color: '#5f3f2f', roughness: 0.98, metalness: 0.0 });
      const canopyMat = new THREE.MeshStandardMaterial({
        color: '#29a33f',
        emissive: '#1f8a33',
        emissiveIntensity: 0.62,
        roughness: 0.86,
        metalness: 0.01,
      });
      const patchMat = new THREE.MeshBasicMaterial({
        color: '#1e7d33',
        transparent: true,
        opacity: 0.45,
        depthTest: false,
        depthWrite: false,
      });
      const trunk = new THREE.InstancedMesh(trunkGeom, trunkMat, cap);
      const canopy = new THREE.InstancedMesh(canopyGeom, canopyMat, cap);
      const patches = new THREE.InstancedMesh(patchGeom, patchMat, cap);

      const m = new THREE.Matrix4();
      const p = new THREE.Vector3();
      const q = new THREE.Quaternion();
      const s = new THREE.Vector3();
      let n = 0;

      for (const f of points) {
        const c = f.geometry.coordinates as number[];
        const lon = Number(c[0]);
        const lat = Number(c[1]);
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
        const elev = await sampleElev(lon, lat);
        const { x, z } = projectLonLat(lon, lat, modelCenter);
        // Densify each tree point into a visible forest cluster.
        for (let k = 0; k < 12 && n < cap; k += 1) {
          const jitterR = k === 0 ? 0 : 6.5 + Math.random() * 11;
          const theta = (Math.PI * 2 * k) / 11 + Math.random() * 0.35;
          const jx = x + Math.cos(theta) * jitterR;
          const jz = -z + Math.sin(theta) * jitterR;
          const scale = 2.4 + Math.random() * 2.2;
          q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);

          p.set(jx, elev + 2.1 * scale, jz);
          s.set(1, scale, 1);
          m.compose(p, q, s);
          trunk.setMatrixAt(n, m);

          p.set(jx, elev + 7.8 * scale, jz);
          s.set(1.18, scale, 1.18);
          m.compose(p, q, s);
          canopy.setMatrixAt(n, m);

          // Ground canopy patch to keep vegetation visible at high camera altitudes.
          const patchScale = 1.0 + Math.random() * 1.35;
          p.set(jx, elev + 0.55, jz);
          q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
          s.set(patchScale, patchScale, 1);
          m.compose(p, q, s);
          patches.setMatrixAt(n, m);
          n += 1;
        }
      }

      if (n > 0) {
        trunk.count = n;
        canopy.count = n;
        patches.count = n;
        trunk.instanceMatrix.needsUpdate = true;
        canopy.instanceMatrix.needsUpdate = true;
        patches.instanceMatrix.needsUpdate = true;
        trunk.castShadow = false;
        canopy.castShadow = false;
        trunk.receiveShadow = false;
        canopy.receiveShadow = false;
        trunk.material.depthTest = false;
        canopy.material.depthTest = false;
        patches.material.depthTest = false;
        patches.renderOrder = 26;
        group.add(trunk);
        group.add(canopy);
        group.add(patches);
      } else {
        trunk.geometry.dispose();
        canopy.geometry.dispose();
        patchGeom.dispose();
        trunkMat.dispose();
        canopyMat.dispose();
        patchMat.dispose();
      }
    };

    const addLabels = async (labels: GeoJsonFC) => {
      const pts = labels.features
        .filter((f) => f.geometry.type === 'Point' && typeof f.properties?.name === 'string')
        .sort((a, b) => Number(b.properties?.priority || 0) - Number(a.properties?.priority || 0))
        .slice(0, 80);

      for (const f of pts) {
        const c = f.geometry.coordinates as number[];
        const lon = Number(c[0]);
        const lat = Number(c[1]);
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
        const name = String(f.properties?.name || '').trim();
        if (!name) continue;
        const elev = await sampleElev(lon, lat);
        const { x, z } = projectLonLat(lon, lat, modelCenter);
        const marker = makePoiMarker(String(f.properties?.kind || 'place'));
        marker.position.set(x, elev + 10, -z);
        group.add(marker);
        registerTooltipTarget(marker, () => {
          const klass = f.properties?.class ? String(f.properties.class) : 'location';
          return `<b>${name}</b><br/><b>Class:</b> ${klass}`;
        });
        tooltipTargetsRef.current.push(marker);
        const sprite = makeLabelSprite(name);
        if (!sprite) continue;
        sprite.position.set(x, elev + 22, -z);
        sprite.renderOrder = 30;
        group.add(sprite);
      }
    };

    const build = async () => {
      try {
        const [roads, buildings, trees, labels] = await Promise.all([
          loadGeoJson('/generated/roads.geojson'),
          loadGeoJson('/generated/buildings.geojson'),
          loadGeoJson('/generated/trees.geojson'),
          loadGeoJson('/generated/labels.geojson'),
        ]);
        if (disposed) return;

        await addRoads(roads);
        await addBuildings(buildings);
        await addTrees(trees);
        await addLabels(labels);

        console.info('[OsmEnvironmentLayer] offline layers loaded', {
          roads: roads.features.length,
          buildings: buildings.features.length,
          trees: trees.features.length,
          labels: labels.features.length,
        });
      } catch (error) {
        console.warn('[OsmEnvironmentLayer] offline load failed. Run scripts/export_osm_environment_geojson.py', error);
      }
    };

    build();

    return () => {
      disposed = true;
      tooltipTargetsRef.current.forEach((obj) => unregisterTooltipTarget(obj));
      tooltipTargetsRef.current = [];
      if (groupRef.current) {
        dynamicGroup.remove(groupRef.current);
        groupRef.current.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if ((obj as THREE.Sprite).isSprite) {
            const mat = (obj as THREE.Sprite).material as THREE.SpriteMaterial;
            mat.map?.dispose();
            mat.dispose();
            return;
          }
          if (mesh.isMesh) {
            mesh.geometry?.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else {
              mesh.material?.dispose();
            }
          }
        });
      }
      groupRef.current = null;
    };
  }, [dynamicGroup, meshVisible, modelCenter, registerTooltipTarget, unregisterTooltipTarget]);

  return null;
}
