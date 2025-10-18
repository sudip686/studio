// cesium-borehole-layer.ts

// Most imports are no longer needed
import {
  Cartesian2,
  Cartesian3,
  Color,
  CornerType,
  Transforms,
  Matrix4
} from "cesium";

// The circleShape and getSurfaceHeight functions remain exactly the same.
const collarHeightCache = new Map<string, number>();
const key = (lon: number, lat: number) => `${lon.toFixed(6)},${lat.toFixed(6)}`;

function circleShape(radius = 0.25) {
  const shape = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    shape.push(new Cartesian2(Math.cos(a) * radius, Math.sin(a) * radius));
  }
  return shape;
}

/**
 * Creates many boreholes as Entities within a single CustomDataSource.
 * This uses a more compatible rendering path than Primitives.
 */
export async function createBoreholeEntities(
  Cesium: any,
  holes: Array<{
    lon: number;
    lat: number;
    depth: number;
    color: Color;
    topHeight: number;
    id: any;
    properties: any;
  }>
): Promise<any> { // Returns a CustomDataSource
  console.log('[createBoreholeEntities] start for', holes.length, 'holes');
  
  const dataSource = new Cesium.CustomDataSource('boreholes');
  const width = 0.5; // Borehole width
  const collarOffset = 0.4; // Raise a bit above mesh to avoid z-fight

  for (const h of holes) {
    if (h.depth <= 0) continue;

    const top = Cartesian3.fromDegrees(h.lon, h.lat, h.topHeight + collarOffset);
    
    // Create a local frame at the top of the borehole to calculate the bottom point
    const enu = Transforms.eastNorthUpToFixedFrame(top);
    const bottomLocal = new Cartesian3(0, 0, -h.depth); // Down is -Z in this local frame
    const bottom = Matrix4.multiplyByPoint(enu, bottomLocal, new Cartesian3());

    dataSource.entities.add({
      id: h.id,
      properties: h.properties,
      polylineVolume: {
        positions: [top, bottom],
        shapePositions: circleShape(width),
        cornerType: CornerType.MITERED,
        material: h.color,
      },
    });
  }
  
  console.log('[createBoreholeEntities] end, created 1 data source.');
  return dataSource;
}