import * as Cesium from 'cesium';

export async function fitViewerToDataSource(
  viewer: any,
  dataSource: any,
  {
    headingDeg = 30,
    pitchDeg = -35,
    rangeScale = 3.5,
    duration = 1.6,
    maxTries = 12,         // ~1.2s worst-case
    tryDelayMs = 100,
  } = {}
) {
  const Cesium = (window as any).Cesium;
  await dataSource.readyPromise?.catch?.(() => {});
  const ents = dataSource?.entities?.values ?? [];

  if (!ents.length) {
    // datasource with no entities: just zoom to DS
    const offset = new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(headingDeg),
      Cesium.Math.toRadians(pitchDeg),
      0
    );
    await viewer.zoomTo(dataSource, offset);
    viewer.scene.requestRender();
    return;
  }

  // Try a few times until BoundingSpheres are DONE
  let attempt = 0;
  while (attempt <= maxTries) {
    const spheres: any[] = [];
    const tmp = new Cesium.BoundingSphere();
    for (let i = 0; i < ents.length; i++) {
      const state = viewer.dataSourceDisplay.getBoundingSphere(ents[i], true, tmp);
      if (state === Cesium.BoundingSphereState.DONE) {
        spheres.push(new Cesium.BoundingSphere(tmp.center, tmp.radius));
      }
    }
    if (spheres.length > 0) {
      const union = Cesium.BoundingSphere.fromBoundingSpheres(spheres);
      const offset = new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(headingDeg),
        Cesium.Math.toRadians(pitchDeg),
        Math.max(250, union.radius * rangeScale)
      );
      await viewer.camera.flyToBoundingSphere(union, { offset, duration });
      viewer.scene.requestRender();
      return;
    }
    // wait a tick and try again
    await new Promise(r => setTimeout(r, tryDelayMs));
    attempt++;
  }

  // Fallback: zoomTo the whole datasource
  const offset = new Cesium.HeadingPitchRange(
    Cesium.Math.toRadians(headingDeg),
    Cesium.Math.toRadians(pitchDeg),
    0
  );
  await viewer.zoomTo(dataSource, offset);
  viewer.scene.requestRender();
}
