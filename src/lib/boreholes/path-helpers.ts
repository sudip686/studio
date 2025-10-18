/**
 * Calculates the cumulative distances at each vertex of a Cartesian path.
 * @param path - An array of Cesium.Cartesian3 points.
 * @returns An array of numbers where each element is the cumulative distance to that vertex.
 */
export function calculateCumulativeDistances(path: any[]): number[] {
  const Cesium = (window as any).Cesium;
  if (!Cesium) return [];
  const distances: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    const dist = Cesium.Cartesian3.distance(path[i - 1], path[i]);
    distances.push(distances[i - 1] + dist);
  }
  return distances;
}

/**
 * Finds the 3D Cartesian point at a specific distance along a multi-segment path.
 * @param path - The array of Cesium.Cartesian3 points defining the path.
 * @param cumulativeDistances - Pre-calculated cumulative distances for the path vertices.
 * @param distance - The target distance along the path.
 * @returns The interpolated Cesium.Cartesian3 point at the target distance.
 */
export function getPointAlongPath(path: any[], cumulativeDistances: number[], distance: number): any {
  const Cesium = (window as any).Cesium;
  if (!Cesium) return undefined;

  // Handle distance being at or beyond the start of the path
  if (distance <= 0) {
    return path[0];
  }

  // Find the segment where the distance falls
  for (let i = 1; i < cumulativeDistances.length; i++) {
    const d1 = cumulativeDistances[i - 1];
    const d2 = cumulativeDistances[i];

    if (distance > d1 && distance <= d2) {
      const segmentStart = path[i - 1];
      const segmentEnd = path[i];
      const segmentLength = d2 - d1;
      const distanceIntoSegment = distance - d1;
      const t = distanceIntoSegment / segmentLength;

      const direction = Cesium.Cartesian3.subtract(segmentEnd, segmentStart, new Cesium.Cartesian3());
      const offset = Cesium.Cartesian3.multiplyByScalar(direction, t, new Cesium.Cartesian3());
      return Cesium.Cartesian3.add(segmentStart, offset, new Cesium.Cartesian3());
    }
  }

  // If distance is beyond the end of the path, return the last point
  return path[path.length - 1];
}
