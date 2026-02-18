#!/usr/bin/env node
/**
 * Build terrain_surface.glb from:
 *  - public/terrain_meta.json
 *  - public/dem_height_4097_u16.png (16-bit height encoded in RG)
 *
 * Notes
 *  - We export a geometry-only GLB (no embedded texture) to keep size manageable.
 *    At runtime, we apply texture_rgb_8192.png on the material.
 *  - Default grid resolution is 1025 x 1025 to stay performant and produce a GLB ~tens of MB.
 *    You can increase via env SEGMENTS=2049 if you need maximum fidelity (may be extremely large).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const META_PATH = path.join(PUBLIC_DIR, 'terrain_meta.json');
const META_COVERAGE_PATH = path.join(PUBLIC_DIR, 'terrain_meta_coverage.json'); // optional larger-coverage meta
const HEIGHT_PNG_PATH = path.join(PUBLIC_DIR, 'dem_height_4097_u16.png');
const OUTPUT_PATH = path.join(PUBLIC_DIR, 'terrain_surface.glb');

const SEGMENTS = Number(process.env.SEGMENTS || 1025); // set 2049 if you want maximum fidelity

// Polyfill for Node.js environment - must come before importing three
// Add DOMException if missing
if (typeof globalThis.DOMException === 'undefined') {
  globalThis.DOMException = class DOMException extends Error {
    constructor(message = '', name = 'Error') {
      super(message);
      this.name = name;
    }
  };
}
if (typeof globalThis.Blob === 'undefined') {
  globalThis.Blob = class Blob {
    constructor(parts = [], options = {}) {
      this.parts = parts;
      this.type = options.type || '';
    }
    
    slice(start = 0, end = undefined, contentType = '') {
      const totalLength = this._getSize();
      const s = start < 0 ? Math.max(totalLength + start, 0) : Math.min(start, totalLength);
      const e = end === undefined ? totalLength : end < 0 ? Math.max(totalLength + end, 0) : Math.min(end, totalLength);
      
      const sliceSize = Math.max(0, e - s);
      const sliceBuffer = Buffer.alloc(sliceSize);
      let currentOffset = 0;
      let written = 0;
      
      for (const part of this.parts) {
        const partBuffer = Buffer.isBuffer(part) ? part : Buffer.from(typeof part === 'string' ? part : part.toString());
        const partSize = partBuffer.length;
        
        if (currentOffset + partSize > s && written < sliceSize) {
          const startInPart = Math.max(0, s - currentOffset);
          const endInPart = Math.min(partSize, e - currentOffset);
          const toCopy = endInPart - startInPart;
          partBuffer.copy(sliceBuffer, written, startInPart, endInPart);
          written += toCopy;
        }
        currentOffset += partSize;
      }
      
      return new Blob([sliceBuffer], { type: contentType || this.type });
    }
    
    _getSize() {
      return this.parts.reduce((sum, part) => sum + (Buffer.isBuffer(part) ? part.length : Buffer.from(typeof part === 'string' ? part : part.toString()).length), 0);
    }
    
    get size() {
      return this._getSize();
    }
    
    async arrayBuffer() {
      const buffers = this.parts.map(part => {
        if (Buffer.isBuffer(part)) return part;
        if (typeof part === 'string') return Buffer.from(part);
        if (part instanceof Uint8Array) return Buffer.from(part);
        if (part instanceof ArrayBuffer) return Buffer.from(new Uint8Array(part));
        if (ArrayBuffer.isView(part)) return Buffer.from(part.buffer, part.byteOffset, part.byteLength);
        return Buffer.from(String(part ?? ''));
      });
      const concatted = Buffer.concat(buffers);
      // Return a standalone ArrayBuffer copy (no shared slice pitfalls)
      const out = new ArrayBuffer(concatted.length);
      new Uint8Array(out).set(concatted);
      return out;
    }
    
    async text() {
      const buf = await this.arrayBuffer();
      return Buffer.from(buf).toString('utf-8');
    }
    
    stream() {
      throw new Error('Blob.stream() not implemented');
    }
  };
}

// Minimal FileReader polyfill for Node to satisfy GLTFExporter (binary mode)
if (typeof globalThis.FileReader === 'undefined') {
  class NodeFileReader {
    constructor() {
      this.onload = null;
      this.onerror = null;
      this.onloadend = null;
      this.onprogress = null;
      this.result = null;
      this.readyState = 0; // EMPTY
    }
    readAsArrayBuffer(blob) {
      try {
        if (!blob) {
          const err = new Error('Blob is null or undefined');
          if (this.onerror) this.onerror({ target: this, error: err });
          if (this.onloadend) this.onloadend({ target: this, error: err });
          return;
        }
        
        // Handle Uint8Array or Buffer directly
        if (blob instanceof Uint8Array || Buffer.isBuffer(blob)) {
          const arrayBuffer = blob instanceof Buffer ? blob.buffer.slice(blob.byteOffset, blob.byteOffset + blob.byteLength) : blob.buffer.slice(0);
          this.result = arrayBuffer;
          this.readyState = 2; // DONE
          if (this.onload) this.onload({ target: this });
          if (this.onloadend) this.onloadend({ target: this });
          return;
        }
        
        // Handle objects with arrayBuffer method
        if (typeof blob?.arrayBuffer === 'function') {
          blob.arrayBuffer()
            .then((buf) => {
              this.result = buf;
              this.readyState = 2; // DONE
              if (this.onload) this.onload({ target: this });
              if (this.onloadend) this.onloadend({ target: this });
            })
            .catch((e) => {
              if (this.onerror) this.onerror({ target: this, error: e });
              if (this.onloadend) this.onloadend({ target: this, error: e });
            });
          return;
        }
        
        // Default error
        const err = new Error('Cannot read blob as ArrayBuffer');
        if (this.onerror) this.onerror({ target: this, error: err });
        if (this.onloadend) this.onloadend({ target: this, error: err });
      } catch (e) {
        if (this.onerror) this.onerror({ target: this, error: e });
        if (this.onloadend) this.onloadend({ target: this, error: e });
      }
    }
    readAsText() { 
      const err = new Error('readAsText not implemented'); 
      if (this.onerror) this.onerror({ target: this, error: err }); 
      if (this.onloadend) this.onloadend({ target: this, error: err });
    }
    readAsDataURL() { 
      const err = new Error('readAsDataURL not implemented'); 
      if (this.onerror) this.onerror({ target: this, error: err }); 
      if (this.onloadend) this.onloadend({ target: this, error: err });
    }
  }
  globalThis.FileReader = NodeFileReader;
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function readPNG(p) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(p)
      .pipe(new PNG({ filterType: 4 }))
      .on('parsed', function () { resolve(this); })
      .on('error', reject);
  });
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

async function main() {
  console.log(`[terrain] Building GLB at resolution ${SEGMENTS}x${SEGMENTS}...`);
  const mem0 = process.memoryUsage();
  console.log('[terrain] mem@start(MB):', Object.fromEntries(Object.entries(mem0).map(([k,v])=>[k, Math.round(v/1e6)])));

  if (!fs.existsSync(META_PATH)) throw new Error(`Missing ${META_PATH}`);
  if (!fs.existsSync(HEIGHT_PNG_PATH)) throw new Error(`Missing ${HEIGHT_PNG_PATH}`);

  const meta = readJSON(META_PATH);
  const coverageMeta = fs.existsSync(META_COVERAGE_PATH) ? readJSON(META_COVERAGE_PATH) : null;
  const originalBounds = meta.bounds_utm;
  const rasterBounds = (coverageMeta?.bounds_utm) ?? originalBounds; // actual PNG coverage bounds
  // Try to expand original bounds if raster covers it.
  // Configurable via env TERRAIN_EXPAND_M (meters). Default 3000 to preserve behavior.
  const EXPAND_M = Number(process.env.TERRAIN_EXPAND_M || 3000);
  const expanded = {
    minX: originalBounds.minX - EXPAND_M,
    minY: originalBounds.minY - EXPAND_M,
    maxX: originalBounds.maxX + EXPAND_M,
    maxY: originalBounds.maxY + EXPAND_M,
  };
  const contains = (outer, inner) => outer.minX <= inner.minX && outer.minY <= inner.minY && outer.maxX >= inner.maxX && outer.maxY >= inner.maxY;
  const modelBounds = contains(rasterBounds, expanded) ? expanded : originalBounds;
  const { minX: mMinX, minY: mMinY, maxX: mMaxX, maxY: mMaxY } = modelBounds;
  const { minX: rMinX, minY: rMinY, maxX: rMaxX, maxY: rMaxY } = rasterBounds;
  const { min: zMin, max: zMax } = meta.elevation_m;

  const heightPng = await readPNG(HEIGHT_PNG_PATH);
  const hW = heightPng.width, hH = heightPng.height;
  if (!hW || !hH) throw new Error('Failed to read height PNG dimensions');

  const modelWidth = mMaxX - mMinX;
  const modelHeight = mMaxY - mMinY;
  const rasterWidth = rMaxX - rMinX;
  const rasterHeight = rMaxY - rMinY;

  // Geometry centered at origin (X east, Z north negative in runtime); we'll set Z negative here already
  const geom = new THREE.BufferGeometry();
  const VERTS = SEGMENTS * SEGMENTS;
  const positions = new Float32Array(VERTS * 3);
  const uvs = new Float32Array(VERTS * 2);
  const indices = new Uint32Array((SEGMENTS - 1) * (SEGMENTS - 1) * 6);

  const pxData = heightPng.data; // RGBA per pixel; 16-bit height encoded as (R<<8 | G)

  const sampleHeight = (easting, northing) => {
    // Map model easting/northing to raster UV
    const u = clamp01((easting - rMinX) / rasterWidth);
    const v = clamp01((rMaxY - northing) / rasterHeight);
    const x = Math.floor(u * (hW - 1));
    const y = Math.floor(v * (hH - 1));
    const off = (y * hW + x) * 4;
    const r = pxData[off];
    const g = pxData[off + 1];
    const normalized = ((r << 8) | g) / 65535.0;
    return zMin + normalized * (zMax - zMin);
  };

  // Build grid
  for (let iy = 0; iy < SEGMENTS; iy++) {
    const rowV = iy / (SEGMENTS - 1);
    const northing = mMaxY - rowV * modelHeight;
    for (let ix = 0; ix < SEGMENTS; ix++) {
      const colU = ix / (SEGMENTS - 1);
      const easting = mMinX + colU * modelWidth;

      const idx = iy * SEGMENTS + ix;
      const elev = sampleHeight(easting, northing);

      // Centered coordinates
      const x = (colU - 0.5) * modelWidth;
      const z = -((rowV - 0.5) * modelHeight);

      positions[idx * 3 + 0] = x;
      positions[idx * 3 + 1] = elev - zMin; // base at 0, relative to min elevation
      positions[idx * 3 + 2] = z;

      // UVs relative to raster coverage so the external texture aligns
      uvs[idx * 2 + 0] = clamp01((easting - rMinX) / rasterWidth);
      uvs[idx * 2 + 1] = clamp01((northing - rMinY) / rasterHeight);
    }
  }

  // Build indices
  let w = SEGMENTS;
  let ptr = 0;
  for (let y = 0; y < SEGMENTS - 1; y++) {
    for (let x = 0; x < SEGMENTS - 1; x++) {
      const a = y * w + x;
      const b = y * w + x + 1;
      const c = (y + 1) * w + x;
      const d = (y + 1) * w + x + 1;
      indices[ptr++] = a; indices[ptr++] = c; indices[ptr++] = b;
      indices[ptr++] = b; indices[ptr++] = c; indices[ptr++] = d;
    }
  }

  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geom.setIndex(new THREE.BufferAttribute(indices, 1));
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
  geom.computeBoundingBox();

  const posCount = positions.length / 3;
  const triCount = indices.length / 3;
  console.log('[terrain] verts:', posCount.toLocaleString(), 'tris:', triCount.toLocaleString(), 'indices bytes:', indices.byteLength.toLocaleString());

  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.0, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = 'terrain-surface';

  const scene = new THREE.Scene();
  scene.add(mesh);

  // Export to GLB
  console.log('[terrain] Exporting GLB...');
  console.time('[terrain] Export time');
  
  const exporter = new GLTFExporter();
  const options = { binary: true };

  // Periodic heartbeat so we know exporter is alive
  let hbTicks = 0;
  const hb = setInterval(() => {
    hbTicks++;
    const mem = process.memoryUsage();
    if (hbTicks % 10 === 0) {
      console.log(`[terrain] heartbeat ${hbTicks}, rss(MB)=${Math.round(mem.rss/1e6)}`);
    }
  }, 1000);

  let exportResult;
  try {
    // Create a wrapper to handle exporter's parse method
    // THREE.js GLTFExporter.parse behavior in Node.js can be problematic,
    // so we wrap it carefully with fallback handling
    
    // Prefer parseAsync when available
    if (typeof exporter.parseAsync === 'function') {
      console.log('[terrain] Info: Using exporter.parseAsync');
      exportResult = await exporter.parseAsync(scene, options);
    } else {
      exportResult = await new Promise((resolve, reject) => {
      let resultReceived = false;
      let errorReceived = false;
      
      const safeResolve = (val) => {
        if (!resultReceived && !errorReceived) {
          resultReceived = true;
          resolve(val);
        }
      };
      
      const safeReject = (err) => {
        if (!resultReceived && !errorReceived) {
          errorReceived = true;
          reject(err);
        }
      };
      
      // Set up a timeout as safety measure
      const timeoutId = setTimeout(() => {
        if (!resultReceived && !errorReceived) {
          errorReceived = true;
          reject(new Error('Export timed out after 60 seconds'));
        }
      }, 60000);
      
      try {
        console.log('[terrain] Info: Exporter initialized, calling parse()');
        console.log('[terrain] Info: Scene has', scene.children.length, 'children');
        
        // Call parse with maximum compatibility flags
        exporter.parse(
          scene,
          (gltfData) => {
            clearTimeout(timeoutId);
            console.log('[terrain] Info: Success callback triggered');
            console.log('[terrain] Info: Result type:', typeof gltfData, 'is Uint8Array:', gltfData instanceof Uint8Array, 'is ArrayBuffer:', gltfData instanceof ArrayBuffer);
            safeResolve(gltfData);
          },
          (error) => {
            clearTimeout(timeoutId);
            console.log('[terrain] Info: Error callback triggered with:', error);
            safeReject(error);
          },
          options
        );
        
        console.log('[terrain] Info: parse() call completed (sync part done)');
        
      } catch (syncErr) {
        clearTimeout(timeoutId);
        console.error('[terrain] Error: Synchronous exception during parse:', syncErr.message || syncErr);
        safeReject(syncErr);
      }
    });
    }
    
  } catch (e) {
    console.error('[terrain] Error: Export promise rejected:', e.message || e);
    throw e;
  }

  // Write the result to file
  try {
    let buffer;
    
    if (exportResult instanceof ArrayBuffer) {
      buffer = Buffer.from(exportResult);
    } else if (exportResult instanceof Uint8Array) {
      buffer = Buffer.from(exportResult);
    } else if (Buffer.isBuffer(exportResult)) {
      buffer = exportResult;
    } else if (exportResult instanceof Blob) {
      console.log('[terrain] Result is a Blob, converting...');
      const arrayBuffer = await exportResult.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      throw new Error(`Unexpected export result type: ${exportResult?.constructor?.name || typeof exportResult}`);
    }

    fs.writeFileSync(OUTPUT_PATH, buffer);
    console.log(`[terrain] Wrote ${OUTPUT_PATH} (${buffer.length.toLocaleString()} bytes)`);
    console.timeEnd('[terrain] Export time');
  } catch (e) {
    console.error('[terrain] Failed to write GLB file:', e);
    throw e;
  }

  clearInterval(hb);
  const mem1 = process.memoryUsage();
  console.log('[terrain] mem@end(MB):', Object.fromEntries(Object.entries(mem1).map(([k,v])=>[k, Math.round(v/1e6)])));
  
  // Write optional runtime config so Three.js can configure visible clipping from build vars
  try {
    const runtimeCfgPath = path.join(PUBLIC_DIR, 'terrain_runtime.json');
    const clipRadiusM = Number(process.env.TERRAIN_CLIP_RADIUS_M || EXPAND_M || 3000);
    const runtimeCfg = { clipRadiusM };
    fs.writeFileSync(runtimeCfgPath, JSON.stringify(runtimeCfg, null, 2));
    console.log(`[terrain] Wrote ${runtimeCfgPath}:`, runtimeCfg);
  } catch (e) {
    console.warn('[terrain] Warning: failed to write terrain_runtime.json:', e?.message || e);
  }
  console.log('[terrain] Done');
}

main().catch((e) => {
  console.error('[terrain] Failed:', e);
  process.exit(1);
});
