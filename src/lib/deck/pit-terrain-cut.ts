import * as THREE from 'three';
import type {Point2} from './site-planning';

type Vertex = {x: number; z: number; weights: [number, number, number]};
type RimPoint = [x: number, y: number, z: number];
const epsilon = 1e-7;

const samePoint = (a: Vertex, b: Vertex) => Math.hypot(a.x - b.x, a.z - b.z) <= epsilon;

function interpolate(a: Vertex, b: Vertex, t: number): Vertex {
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
    weights: a.weights.map((weight, i) => weight + (b.weights[i] - weight) * t) as Vertex['weights'],
  };
}

function splitPolygon(polygon: Vertex[], distance: (point: Vertex) => number) {
  const outside: Vertex[] = [], inside: Vertex[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const start = distance(a), end = distance(b);
    if (start >= -epsilon) inside.push(a);
    if (start <= epsilon) outside.push(a);
    if ((start > epsilon && end < -epsilon) || (start < -epsilon && end > epsilon)) {
      const intersection = interpolate(a, b, start / (start - end));
      inside.push(intersection);
      outside.push(intersection);
    }
  }
  return {inside, outside};
}

function twiceArea(polygon: Vertex[]) {
  if (polygon.length < 3) return 0;
  const origin = polygon[0];
  return polygon.slice(1, -1).reduce((area, a, i) => {
    const b = polygon[i + 2];
    return area + (a.x - origin.x) * (b.z - origin.z) - (a.z - origin.z) * (b.x - origin.x);
  }, 0);
}

function parameterOnEdge(point: Vertex, a: Vertex, b: Vertex): number | null {
  const dx = b.x - a.x, dz = b.z - a.z;
  const length = Math.hypot(dx, dz);
  if (length < epsilon || Math.abs(dx * (point.z - a.z) - dz * (point.x - a.x)) > epsilon * length) return null;
  return ((point.x - a.x) * dx + (point.z - a.z) * dz) / (length * length);
}

function insertRimVertices(polygon: Vertex[], rim: Vertex[]) {
  return polygon.flatMap((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    const splits = rim.flatMap(point => {
      const t = parameterOnEdge(point, a, b);
      return t !== null && t > epsilon && t < 1 - epsilon ? [{point, t}] : [];
    }).sort((p, q) => p.t - q.t);
    return [a, ...splits.map(({point}) => point)];
  }).filter((point, i, points) => !samePoint(point, points[(i + points.length - 1) % points.length]));
}

/** Cut disjoint convex pit footprints into an indexed terrain mesh in local metre coordinates. */
export function cutPitTerrain(terrain: THREE.BufferGeometry, rings: readonly Point2[][]) {
  const position = terrain.getAttribute('position');
  const original = terrain.getIndex();
  if (!position || !original) throw new Error('Pit terrain cut requires indexed positions');

  const pits = rings.map(ring => {
    const signedArea = ring.reduce((area, a, i) => {
      const b = ring[(i + 1) % ring.length];
      return area + a[0] * b[1] - a[1] * b[0];
    }, 0);
    if (ring.length < 3 || Math.abs(signedArea) < epsilon) throw new Error('Pit outline has no area');
    const orientation = Math.sign(signedArea);
    const edges = ring.map(([x, z], i) => {
      const [endX, endZ] = ring[(i + 1) % ring.length];
      const dx = endX - x, dz = endZ - z;
      const length = Math.hypot(dx, dz);
      if (length < epsilon) throw new Error('Pit outline contains a repeated point');
      return {x, z, dx, dz, length, points: new Map<number, number>(), distance: (p: Vertex) => orientation * (dx * (p.z - z) - dz * (p.x - x)) / length};
    });
    return {edges, minX: Math.min(...ring.map(p => p[0])), maxX: Math.max(...ring.map(p => p[0])), minZ: Math.min(...ring.map(p => p[1])), maxZ: Math.max(...ring.map(p => p[1]))};
  });

  const added: {vertex: Vertex; sourceIndices: number[]}[] = [];
  const addedIndices = new Map<string, number>();
  const indices: number[] = [];
  let changedTriangles = 0;

  for (let offset = 0; offset < original.count; offset += 3) {
    const a = original.getX(offset), b = original.getX(offset + 1), c = original.getX(offset + 2);
    const ax = position.getX(a), bx = position.getX(b), cx = position.getX(c);
    const az = position.getZ(a), bz = position.getZ(b), cz = position.getZ(c);
    const minX = Math.min(ax, bx, cx), maxX = Math.max(ax, bx, cx);
    const minZ = Math.min(az, bz, cz), maxZ = Math.max(az, bz, cz);
    const candidates = pits.filter(pit => pit.maxX >= minX && pit.minX <= maxX && pit.maxZ >= minZ && pit.minZ <= maxZ);
    if (!candidates.length) {
      indices.push(a, b, c);
      continue;
    }

    const sourceIndices = [a, b, c];
    const indexVertex = (vertex: Vertex) => {
      const originalCorner = vertex.weights.findIndex(weight => weight > 1 - 1e-10);
      if (originalCorner >= 0) return sourceIndices[originalCorner];
      const y = vertex.weights.reduce((sum, weight, i) => sum + weight * position.getY(sourceIndices[i]), 0);
      // Weld intersections independently calculated by adjacent source triangles.
      const key = `${Math.round(vertex.x / epsilon)},${Math.round(y / epsilon)},${Math.round(vertex.z / epsilon)}`;
      const found = addedIndices.get(key);
      if (found !== undefined) return found;
      const index = position.count + added.length;
      added.push({vertex, sourceIndices});
      addedIndices.set(key, index);
      return index;
    };
    let pieces: Vertex[][] = [[
      {x: ax, z: az, weights: [1, 0, 0]},
      {x: bx, z: bz, weights: [0, 1, 0]},
      {x: cx, z: cz, weights: [0, 0, 1]},
    ]];
    let changed = false;
    for (const pit of candidates) {
      pieces = pieces.flatMap(piece => {
        let remaining = piece;
        const retained: Vertex[][] = [];
        for (const edge of pit.edges) {
          const {inside, outside} = splitPolygon(remaining, edge.distance);
          if (Math.abs(twiceArea(outside)) > epsilon) retained.push(outside);
          remaining = inside;
          if (remaining.length < 2) break;
        }
        const rim = remaining.filter(point => pit.edges.some(edge => {
          const t = ((point.x - edge.x) * edge.dx + (point.z - edge.z) * edge.dz) / (edge.length * edge.length);
          if (Math.abs(edge.distance(point)) > epsilon || t < -epsilon || t >= 1 - epsilon) return false;
          edge.points.set(Math.round(Math.max(0, t) * edge.length / epsilon), indexVertex(point));
          return true;
        }));
        if (Math.abs(twiceArea(remaining)) <= epsilon) {
          // A rim can run exactly along a terrain edge. Split that edge at
          // the rim vertices even when this triangle loses no area.
          if (!rim.length) return [piece];
          const aligned = insertRimVertices(piece, rim);
          changed ||= aligned.length !== piece.length;
          return [aligned];
        }
        changed = true;
        return retained.map(polygon => insertRimVertices(polygon, rim));
      });
    }
    if (!changed) {
      indices.push(a, b, c);
      continue;
    }
    changedTriangles++;
    for (const polygon of pieces) {
      if (polygon.length === 3) {
        indices.push(...polygon.map(indexVertex));
      } else {
        // A centre fan preserves collinear rim vertices along the polygon boundary.
        const sum = polygon.reduce((total, point) => ({
          x: total.x + point.x, z: total.z + point.z,
          weights: total.weights.map((weight, i) => weight + point.weights[i]) as Vertex['weights'],
        }), {x: 0, z: 0, weights: [0, 0, 0]} as Vertex);
        const centre = indexVertex({x: sum.x / polygon.length, z: sum.z / polygon.length, weights: sum.weights.map(weight => weight / polygon.length) as Vertex['weights']});
        const perimeter = polygon.map(indexVertex);
        perimeter.forEach((index, i) => indices.push(centre, index, perimeter[(i + 1) % perimeter.length]));
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(terrain.attributes)) {
    const {itemSize} = attribute;
    const values = new Float32Array((attribute.count + added.length) * itemSize);
    for (let i = 0; i < attribute.count; i++) {
      for (let component = 0; component < itemSize; component++) values[i * itemSize + component] = attribute.getComponent(i, component);
    }
    added.forEach(({vertex, sourceIndices}, i) => {
      for (let component = 0; component < itemSize; component++) {
        values[(attribute.count + i) * itemSize + component] = vertex.weights.reduce((sum, weight, j) => sum + weight * attribute.getComponent(sourceIndices[j], component), 0);
      }
    });
    geometry.setAttribute(name, new THREE.BufferAttribute(values, itemSize));
  }
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  const cutPosition = geometry.getAttribute('position');
  const rims: RimPoint[][] = pits.map(({edges}) => edges.flatMap(({points}) => [...points.entries()].sort(([a], [b]) => a - b).map(([, index]) => [cutPosition.getX(index), cutPosition.getY(index), cutPosition.getZ(index)] as RimPoint)));
  return {geometry, rims, changedTriangles};
}
