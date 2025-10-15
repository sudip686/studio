export function clipTilesetToRectangle(tileset: any, rect: any, padMeters = 50) {
  const Cesium = (window as any).Cesium;

  // AOI center + ENU frame
  const center = Cesium.Rectangle.center(rect);
  const origin = Cesium.Cartesian3.fromRadians(center.longitude, center.latitude, 0);
  const enu = Cesium.Transforms.eastNorthUpToFixedFrame(origin);

  // Sample midpoints to measure AOI size in meters
  const lc = Cesium.Cartographic.fromRadians(rect.west, center.latitude);
  const rc = Cesium.Cartographic.fromRadians(rect.east, center.latitude);
  const bc = Cesium.Cartographic.fromRadians(center.longitude, rect.south);
  const tc = Cesium.Cartographic.fromRadians(center.longitude, rect.north);
  const L = Cesium.Cartesian3.fromRadians(lc.longitude, lc.latitude, 0);
  const R = Cesium.Cartesian3.fromRadians(rc.longitude, rc.latitude, 0);
  const B = Cesium.Cartesian3.fromRadians(bc.longitude, bc.latitude, 0);
  const T = Cesium.Cartesian3.fromRadians(tc.longitude, tc.latitude, 0);

  const halfX = Cesium.Cartesian3.distance(L, R) * 0.5 + padMeters;
  const halfY = Cesium.Cartesian3.distance(B, T) * 0.5 + padMeters;
  const halfZ = 5000 + padMeters; // generous vertical slab; tune as you like

  // 6 planes of a box in ENU (X±, Y±, Z±)
  const planes = new Cesium.ClippingPlaneCollection({
    modelMatrix: enu,
    planes: [
      new Cesium.ClippingPlane(new Cesium.Cartesian3( 1, 0, 0), -halfX),
      new Cesium.ClippingPlane(new Cesium.Cartesian3(-1, 0, 0), -halfX),
      new Cesium.ClippingPlane(new Cesium.Cartesian3( 0, 1, 0), -halfY),
      new Cesium.ClippingPlane(new Cesium.Cartesian3( 0,-1, 0), -halfY),
      new Cesium.ClippingPlane(new Cesium.Cartesian3( 0, 0, 1), -halfZ),
      new Cesium.ClippingPlane(new Cesium.Cartesian3( 0, 0,-1), -halfZ),
    ],
    unionClippingRegions: true,
    edgeWidth: 0.0
  });

  tileset.clippingPlanes = planes;
  tileset.show = true;
  tileset.readyPromise?.then(() => tileset._root && tileset._root.update);
}