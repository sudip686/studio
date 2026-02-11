"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

type AscGrid = {
  ncols: number;
  nrows: number;
  cellsize: number; // meters per pixel
  nodata: number | null;
  data: Float32Array; // length ncols*nrows, row-major, row 0 = top
};

async function fetchText(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

function parseAsc(text: string): AscGrid {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 6) throw new Error("ASC file too short");
  // Header can be in any order; parse key-values from the first ~6 lines
  let ncols = 0, nrows = 0, cellsize = 1, nodata: number | null = null;
  let headerLinesConsumed = 0;
  for (let i = 0; i < 10 && i < lines.length; i++) {
    const m = lines[i].match(/^\s*(\w+)\s+(.*)$/i);
    if (!m) break;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === "ncols") { ncols = Number(val); headerLinesConsumed++; continue; }
    if (key === "nrows") { nrows = Number(val); headerLinesConsumed++; continue; }
    if (key === "cellsize") { cellsize = Number(val); headerLinesConsumed++; continue; }
    if (key === "nodata_value") { nodata = Number(val); headerLinesConsumed++; continue; }
    if (["xllcorner","xllcenter","yllcorner","yllcenter"].includes(key)) { headerLinesConsumed++; continue; }
    // Stop when keys stop
    if (ncols && nrows && cellsize) break;
  }
  if (!ncols || !nrows) throw new Error("Missing ncols/nrows in ASC header");

  const data = new Float32Array(ncols * nrows);
  let row = 0;
  let dataLineIndex = headerLinesConsumed; // Start after header
  while (row < nrows && dataLineIndex < lines.length) {
    const parts = lines[dataLineIndex].trim().split(/\s+/);
    if (parts.length < ncols) {
      // If a row wraps over multiple lines (rare), accumulate until we reach ncols
      let acc = parts;
      while (acc.length < ncols && dataLineIndex + 1 < lines.length) {
        dataLineIndex++;
        acc = acc.concat(lines[dataLineIndex].trim().split(/\s+/));
      }
      if (acc.length < ncols) throw new Error("ASC data row too short");
      for (let c = 0; c < ncols; c++) data[row * ncols + c] = Number(acc[c]);
    } else {
      for (let c = 0; c < ncols; c++) data[row * ncols + c] = Number(parts[c]);
    }
    row++;
    dataLineIndex++;
  }
  if (row !== nrows) throw new Error("ASC data rows mismatch");
  return { ncols, nrows, cellsize, nodata, data };
}

function resampleBilinear(src: AscGrid, w: number, h: number) {
  const out = new Float32Array(w * h);
  const { ncols, nrows, data, nodata } = src;
  const isNoData = (v: number) => nodata != null && v === nodata;
  for (let y = 0; y < h; y++) {
    const sy = (y / (h - 1)) * (nrows - 1);
    const y0 = Math.floor(sy);
    const y1 = Math.min(y0 + 1, nrows - 1);
    const ty = sy - y0;
    for (let x = 0; x < w; x++) {
      const sx = (x / (w - 1)) * (ncols - 1);
      const x0 = Math.floor(sx);
      const x1 = Math.min(x0 + 1, ncols - 1);
      const tx = sx - x0;

      const i00 = y0 * ncols + x0;
      const i10 = y0 * ncols + x1;
      const i01 = y1 * ncols + x0;
      const i11 = y1 * ncols + x1;
      const v00 = data[i00];
      const v10 = data[i10];
      const v01 = data[i01];
      const v11 = data[i11];

      // Handle nodata by falling back to available neighbors
      const candidates = [v00, v10, v01, v11].filter(v => !isNoData(v) && Number.isFinite(v));
      let v: number;
      if (candidates.length === 0) {
        v = 0; // flat if no data anywhere
      } else if (candidates.length < 4) {
        v = candidates.reduce((a, b) => a + b, 0) / candidates.length;
      } else {
        const a = v00 + tx * (v10 - v00);
        const b = v01 + tx * (v11 - v01);
        v = a + ty * (b - a);
      }
      out[y * w + x] = v;
    }
  }
  return out;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

function drawImageToCanvas(img: HTMLImageElement, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, w, h);
  return c;
}

function computeMinMax(arr: Float32Array, nodata: number | null) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (!Number.isFinite(v)) continue;
    if (nodata != null && v === nodata) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 0 };
  return { min, max };
}

export default function TerrainGlbBuilder() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const controlsRef = useRef<OrbitControls>();
  const meshRef = useRef<THREE.Mesh>();

  const [status, setStatus] = useState<string>("");
  const [ascUrl, setAscUrl] = useState<string>("/Topography.asc");
  const [textureUrl, setTextureUrl] = useState<string>("/geology_map.jpg");
  const [targetVerts, setTargetVerts] = useState<number>(1025);
  const [verticalExaggeration, setVerticalExaggeration] = useState<number>(1.6);
  const [baseAtZero, setBaseAtZero] = useState<boolean>(true);

  const [ascMeta, setAscMeta] = useState<{ cellsize: number; min: number; max: number; ncols: number; nrows: number }|null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    mountRef.current.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1115);
    const camera = new THREE.PerspectiveCamera(50, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1e7);
    camera.position.set(0, 1000, 2000);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(1000, 2000, 1500);
    dir.castShadow = false;
    scene.add(dir);

    const grid = new THREE.GridHelper(10000, 20, 0x888888, 0x444444);
    grid.position.y = 0;
    scene.add(grid);

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;

    let raf = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth, h = mountRef.current.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  async function buildFromAsc() {
    try {
      setStatus("Loading ASC …");
      const txt = await fetchText(ascUrl);
      const asc = parseAsc(txt);
      const { ncols, nrows, cellsize, nodata } = asc;
      const w = targetVerts, h = targetVerts;
      const resampled = resampleBilinear(asc, w, h);
      const { min, max } = computeMinMax(resampled, nodata);
      setAscMeta({ cellsize, min, max, ncols, nrows });

      // World dimensions in meters
      const worldWidth = (ncols - 1) * cellsize;
      const worldHeight = (nrows - 1) * cellsize;

      // Build geometry
      const geom = new THREE.PlaneGeometry(worldWidth, worldHeight, w - 1, h - 1);
      geom.rotateX(-Math.PI / 2);
      const pos = geom.attributes.position as THREE.BufferAttribute;

      const base = baseAtZero ? min : 0;
      for (let i = 0; i < pos.count; i++) {
        const py = Math.floor(i / w);
        const px = i % w;
        const elev = resampled[py * w + px];
        const y = (elev - base) * verticalExaggeration;
        pos.setY(i, Number.isFinite(y) ? y : 0);
      }
      pos.needsUpdate = true;
      geom.computeVertexNormals();

      // Load texture and resize to w,h for 1:1 UV mapping
      setStatus("Loading texture …");
      let img: HTMLImageElement;
      try {
        img = await loadImage(textureUrl);
      } catch (e) {
        // Fallback to topography.png if geology_map.jpg missing
        img = await loadImage("/topography.png");
      }
      const texCanvas = drawImageToCanvas(img, w, h);
      const tex = new THREE.CanvasTexture(texCanvas);
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;

      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 });

      // Cleanup old mesh
      if (meshRef.current) {
        sceneRef.current?.remove(meshRef.current);
        meshRef.current.geometry.dispose();
        const m = meshRef.current.material as THREE.Material;
        m.dispose?.();
      }

      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = false; mesh.receiveShadow = true;
      meshRef.current = mesh;
      sceneRef.current?.add(mesh);

      // Frame camera
      const cam = cameraRef.current!;
      const controls = controlsRef.current!;
      const box = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size); box.getCenter(center);
      controls.target.copy(center);
      cam.position.set(center.x - size.x, center.y + size.y * 1.2, center.z + size.z);
      controls.update();

      setStatus(`Built ${w}×${h} verts, XY ${(worldWidth/1000).toFixed(2)}×${(worldHeight/1000).toFixed(2)} km, Z ${(max - base).toFixed(1)} m (pre-exaggeration)`);
    } catch (e: any) {
      console.error(e);
      setStatus(`Error: ${e?.message || e}`);
    }
  }

  function exportGlb() {
    if (!meshRef.current) return;
    setStatus("Exporting GLB …");
    const exporter = new GLTFExporter();
    exporter.parse(
      meshRef.current,
      (glb) => {
        const blob = new Blob([glb as ArrayBuffer], { type: "model/gltf-binary" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "terrain.glb";
        a.click();
        URL.revokeObjectURL(url);
        setStatus("Exported terrain.glb");
      },
      (err) => {
        console.error(err);
        setStatus("GLB export failed");
      },
      { binary: true }
    );
  }

  return (
    <div style={{ display: "flex", height: "100%", width: "100%" }}>
      <div style={{ width: 320, padding: 12, borderRight: "1px solid #2a2f3a", color: "#e6e8eb", background: "#111418" }}>
        <h3 style={{ margin: "8px 0" }}>Terrain GLB Builder</h3>
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 12 }}>
          1) Loads ASC DEM, 2) resamples to target verts, 3) applies vertical exaggeration, 4) resizes texture to match, 5) exports GLB.
        </div>
        <label style={{ display: "block", fontSize: 12 }}>ASC URL</label>
        <input value={ascUrl} onChange={e=>setAscUrl(e.target.value)} style={{ width: "100%", marginBottom: 8 }} />
        <label style={{ display: "block", fontSize: 12 }}>Texture URL (JPG/PNG)</label>
        <input value={textureUrl} onChange={e=>setTextureUrl(e.target.value)} style={{ width: "100%", marginBottom: 8 }} />
        <label style={{ display: "block", fontSize: 12 }}>Target vertices (per side)</label>
        <select value={targetVerts} onChange={e=>setTargetVerts(Number(e.target.value))} style={{ width: "100%", marginBottom: 8 }}>
          {[257, 513, 1025, 2049].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <label style={{ display: "block", fontSize: 12 }}>Vertical exaggeration</label>
        <input type="number" step="0.1" value={verticalExaggeration} onChange={e=>setVerticalExaggeration(Number(e.target.value))} style={{ width: "100%", marginBottom: 8 }} />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 8 }}>
          <input type="checkbox" checked={baseAtZero} onChange={e=>setBaseAtZero(e.target.checked)} />
          Base at zero (subtract min elevation)
        </label>
        <button onClick={buildFromAsc} style={{ width: "100%", padding: 8, marginBottom: 8, background: "#2563eb", color: "white", borderRadius: 6, border: 0 }}>Build</button>
        <button onClick={exportGlb} disabled={!meshRef.current} style={{ width: "100%", padding: 8, background: meshRef.current?"#10b981":"#334155", color: "white", borderRadius: 6, border: 0 }}>Export GLB</button>

        <div style={{ marginTop: 12, fontSize: 12, color: "#aab2c0" }}>{status}</div>
        {ascMeta && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#aab2c0" }}>
            <div>ASC: {ascMeta.ncols}×{ascMeta.nrows} px, cellsize {ascMeta.cellsize} m</div>
            <div>Elev range: {ascMeta.min.toFixed(2)} → {ascMeta.max.toFixed(2)} m</div>
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>
          Tips:
          <ul style={{ paddingLeft: 18 }}>
            <li>If the result looks flat, increase vertical exaggeration.</li>
            <li>Ensure the texture represents the same geographic extent as the DEM.</li>
            <li>TIFFs won’t load in browsers; convert to JPG/PNG first.</li>
          </ul>
        </div>
      </div>
      <div ref={mountRef} style={{ flex: 1, position: "relative" }} />
    </div>
  );
}
