export const TERRAIN_URL =
  'https://api.maptiler.com/tiles/terrain-quantized-mesh-v2/?key=MQ8jhB5F57QiT1CrsiUJ';

export const waitOneFrame = (viewer: any) =>
  new Promise<void>((resolve) => {
    viewer.scene.requestRender();
    const remove = viewer.scene.preRender.addEventListener(() => {
      remove();
      resolve();
    });
  });

export const pickKmlDataSource = async (viewer: any, tries = 30, delayMs = 100) => {
  const listObj: any = viewer.dataSources?._dataSources ?? viewer.dataSources;
  for (let i = 0; i < tries; i++) {
    const len = listObj?.length ?? 0;
    for (let j = len - 1; j >= 0; j--) {
      const ds = listObj.get ? listObj.get(j) : listObj[j];
      if (ds && ds.constructor && /KmlDataSource/i.test(ds.constructor.name)) {
        await ds.readyPromise?.catch?.(() => {});
        return ds;
      }
    }
    await new Promise(r => setTimeout(r, delayMs));
  }
  return null;
};

export async function fitViewerToDataSource(
  viewer: any,
  dataSource: any,
  {
    headingDeg = 30,
    pitchDeg = -35,
    rangeScale = 3.5,
    duration = 1.6,
    maxTries = 12,
    tryDelayMs = 100,
  } = {}
) {
  const Cesium = (window as any).Cesium;
  await dataSource.readyPromise?.catch?.(() => {});
  const ents = dataSource?.entities?.values ?? [];

  // If no entities, just zoomTo the datasource with a nice offset
  if (!ents.length) {
    const offset = new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(headingDeg),
      Cesium.Math.toRadians(pitchDeg),
      0
    );
    await viewer.zoomTo(dataSource, offset);
    viewer.scene.requestRender();
    return;
  }

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
    if (spheres.length) {
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
    await new Promise(r => setTimeout(r, tryDelayMs));
    attempt++;
  }

  const offset = new Cesium.HeadingPitchRange(
    Cesium.Math.toRadians(headingDeg),
    Cesium.Math.toRadians(pitchDeg),
    0
  );
  await viewer.zoomTo(dataSource, offset);
  viewer.scene.requestRender();
}
