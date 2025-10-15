import { BoreholeRowBase, BoreholeSegment } from "../boreholes/borehole-core";

// utils/drillholes.ts
export async function clampCollarsToSurface(viewer: any, lonLatArr: Array<{lon:number, lat:number}>) {
  const Cesium = (window as any).Cesium;
  const { scene, terrainProvider } = viewer;
  const cartesians = lonLatArr.map(p => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, 0));

  let clamped = await scene.clampToHeightMostDetailed(cartesians).catch(() => undefined);

  if (!clamped || clamped.some((c:any) => !Cesium.defined(c))) {
    const cartos = lonLatArr.map(p => Cesium.Cartographic.fromDegrees(p.lon, p.lat));
    const sampled = await Cesium.sampleTerrainMostDetailed(terrainProvider, cartos);
    clamped = sampled.map((c:any) => Cesium.Cartesian3.fromRadians(c.longitude, c.latitude, c.height));
  }
  return clamped; // Cartesian3[] on the photoreal surface (or terrain)
}

// circle for polylineVolume (16 segments)
function circleShape(radius = 0.25) {
  const Cesium = (window as any).Cesium;
  const shape = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    shape.push(new Cesium.Cartesian2(Math.cos(a) * radius, Math.sin(a) * radius));
  }
  return shape;
}

// positions: absolute world coords along the hole (collar -> intervals -> toe)
export function addDrillholeCylinder(dataSource: any, positions: any[], color?: any) {
  const Cesium = (window as any).Cesium;
  const entity = dataSource.entities.add({
    polylineVolume: {
      positions,
      shape: circleShape(0.3), // meters (tune radius)
      material: color || Cesium.Color.fromBytes(255, 120, 0, 200),
      cornerType: Cesium.CornerType.MITERED
    }
  });
  return entity;
}