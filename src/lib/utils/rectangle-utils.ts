export function bufferRectangleMeters(Cesium: any, rect: any, bufferMeters = 500) {
  const R = 6378137.0; // Earth radius (m)
  const center = Cesium.Rectangle.center(rect);
  const lat = center.latitude; // radians

  const dLat = bufferMeters / R;                 // radians
  const dLon = bufferMeters / (R * Math.cos(lat));

  return Cesium.Rectangle.fromRadians(
    rect.west - dLon,
    rect.south - dLat,
    rect.east + dLon,
    rect.north + dLat
  );
}
