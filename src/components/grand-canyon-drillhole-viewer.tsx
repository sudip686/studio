'use client';

import { useEffect, useRef, useState } from 'react';
import { useCesium } from '@/contexts/cesium-context';
import { Legend } from '@/components/ui/legend';
import { LITHOLOGY_COLOR_MAP_CSS, geospatialViewerLithologyLegendData } from '@/lib/legend-definitions';

interface GrandCanyonDrillholeViewerProps {
  displayMode: 'assay' | 'lithology';
}

const TooltipContent = ({ data }: { data: any }) => {
    if (!data || !data.content) return null;

    return (
        <div
            className="absolute bg-gray-800 text-white p-3 rounded-md shadow-lg text-xs pointer-events-none"
            style={{ top: data.top, left: data.left, transform: 'translate(15px, 15px)' }}
        >
            <p className="font-bold text-base mb-1">Hole ID: {data.content.hole_id}</p>
            <ul className="list-none space-y-1">
                <li><strong>Lat:</strong> {data.content.latitude?.toFixed(5)}</li>
                <li><strong>Lon:</strong> {data.content.longitude?.toFixed(5)}</li>
                <li><strong>Depth From:</strong> {data.content.depth_from?.toFixed(2)} m</li>
                <li><strong>Depth To:</strong> {data.content.depth_to?.toFixed(2)} m</li>
                {data.content.lithology && <li><strong>Lithology:</strong> {data.content.lithology}</li>}
                {data.content.graphitic_carbon !== undefined && (
                    <li><strong>Graphitic Carbon:</strong> {data.content.graphitic_carbon?.toFixed(3)} %</li>
                )}
            </ul>
        </div>
    );
};

const GrandCanyonDrillholeViewer = ({ displayMode }: GrandCanyonDrillholeViewerProps) => {
  const { viewer, ready } = useCesium();
  const dataSourceRef = useRef<any>(null);
  const boxEntityRef = useRef<any>(null);
  const eventHandlerRef = useRef<any>(null);
  const lithologyColorMapCesiumRef = useRef<any>({});
  const [tooltip, setTooltip] = useState<{ display: boolean, top: number, left: number, content: any }>({ display: false, top: 0, left: 0, content: null });
  const [assayRange, setAssayRange] = useState({ min: 0, max: 1 });
  const kmzUrl = '/tanga_boundary.kmz';

  useEffect(() => {
    if (!ready || !viewer) return;
    const Cesium = (window as any).Cesium as typeof import('cesium');
    let isMounted = true;

    Object.keys(LITHOLOGY_COLOR_MAP_CSS).forEach(key => {
        lithologyColorMapCesiumRef.current[key] = Cesium.Color.fromCssColorString(LITHOLOGY_COLOR_MAP_CSS[key]);
    });

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((movement: any) => {
        const pickedObject = viewer.scene.pick(movement.endPosition);
        if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.properties) {
            const entity = pickedObject.id;
            const properties = entity.properties.getValue(viewer.clock.currentTime);
            setTooltip({ display: true, top: movement.endPosition.y, left: movement.endPosition.x, content: properties });
        } else {
            setTooltip({ display: false, top: 0, left: 0, content: null });
        }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    eventHandlerRef.current = handler;

    const setupScene = async () => {
      try {
        // 1) Load drillhole GeoJSON depending on displayMode
        const geojsonPath =
          displayMode === 'lithology' ? '/lithology_data.geojson' : '/assay_data.geojson';
        const response = await fetch(geojsonPath);
        const geoJson = await response.json();

        let minAssay = Infinity, maxAssay = -Infinity;
        if (displayMode === 'assay') {
            geoJson.features.forEach((feature: any) => {
                const carbon = feature.properties.graphitic_carbon;
                if (carbon < minAssay) minAssay = carbon;
                if (carbon > maxAssay) maxAssay = carbon;
            });
            setAssayRange({min: minAssay, max: maxAssay});
        }

        const customDataSource = new Cesium.CustomDataSource('grand-canyon-drillholes');
        geoJson.features.forEach((feature: any) => {
            if (feature.geometry.type === 'LineString') {
                const { properties } = feature;
                const [startCoords, endCoords] = feature.geometry.coordinates;
                const startCartesian = Cesium.Cartesian3.fromDegrees(startCoords[0], startCoords[1], startCoords[2]);
                const endCartesian = Cesium.Cartesian3.fromDegrees(endCoords[0], endCoords[1], endCoords[2]);
                const length = Cesium.Cartesian3.distance(startCartesian, endCartesian);
                if (length === 0) return;

                let color;
                if (displayMode === 'lithology') {
                    color = lithologyColorMapCesiumRef.current[properties.lithology] || lithologyColorMapCesiumRef.current['UNKNOWN'];
                } else {
                    const carbon = properties.graphitic_carbon;
                    const range = maxAssay - minAssay;
                    const alpha = range > 0 ? (carbon - minAssay) / range : 0.5;
                    color = Cesium.Color.fromHsl((1 - alpha) * 0.33, 1, 0.5); // Green to Red gradient
                }

                const midpoint = Cesium.Cartesian3.midpoint(startCartesian, endCartesian, new Cesium.Cartesian3());
                const direction = Cesium.Cartesian3.subtract(endCartesian, startCartesian, new Cesium.Cartesian3());
                Cesium.Cartesian3.normalize(direction, direction);

                // Create a rotation matrix that aligns the Z-axis with the direction vector
                const up = Cesium.Cartesian3.normalize(midpoint, new Cesium.Cartesian3()); // Up vector for the local frame
                const right = Cesium.Cartesian3.cross(direction, up, new Cesium.Cartesian3());
                Cesium.Cartesian3.normalize(right, right);
                const newUp = Cesium.Cartesian3.cross(right, direction, new Cesium.Cartesian3());
                Cesium.Cartesian3.normalize(newUp, newUp);

                const rotation = new Cesium.Matrix3(
                    right.x, newUp.x, direction.x,
                    right.y, newUp.y, direction.y,
                    right.z, newUp.z, direction.z
                );

                const modelMatrix = Cesium.Matrix4.fromRotationTranslation(rotation, midpoint, new Cesium.Matrix4());

                customDataSource.entities.add({
                    position: midpoint,
                    orientation: Cesium.Quaternion.fromRotationMatrix(rotation),
                    cylinder: { length: length, topRadius: 15, bottomRadius: 15, material: color },
                    properties: { ...properties, latitude: startCoords[1], longitude: startCoords[0] }
                });
            }
        });

        if (!isMounted || viewer.isDestroyed()) return;
        await viewer.dataSources.add(customDataSource);
        viewer.scene.requestRender();
        dataSourceRef.current = customDataSource;

        // 2) Load KMZ boundary to compute box clipping planes
        const ds = await Cesium.KmlDataSource.load(kmzUrl, { clampToGround: true });
        await viewer.dataSources.add(ds);
        viewer.scene.requestRender();
        await viewer.flyTo(ds);
        viewer.scene.requestRender();

        const rect = viewer.camera.computeViewRectangle();
        if (!rect) return;

        // Compute local ENU at center
        const centerCarto = Cesium.Rectangle.center(rect);
        const center = Cesium.Cartesian3.fromRadians(
          centerCarto.longitude,
          centerCarto.latitude,
          0
        );
        const enu = Cesium.Transforms.eastNorthUpToFixedFrame(center);

        // Project rectangle corners into ENU
        const corners = [
          Cesium.Cartesian3.fromRadians(rect.west, rect.north),
          Cesium.Cartesian3.fromRadians(rect.east, rect.north),
          Cesium.Cartesian3.fromRadians(rect.east, rect.south),
          Cesium.Cartesian3.fromRadians(rect.west, rect.south),
        ].map((c) =>
          Cesium.Matrix4.multiplyByPoint(
            Cesium.Matrix4.inverseTransformation(enu, new Cesium.Matrix4()),
            c,
            new Cesium.Cartesian3()
          )
        );

        const xs = corners.map((c) => c.x);
        const ys = corners.map((c) => c.y);
        const hx = (Math.max(...xs) - Math.min(...xs)) / 2;
        const hy = (Math.max(...ys) - Math.min(...ys)) / 2;
        const hz = Math.max(hx, hy) * 1.2; // make it tall

        // 3) Build 6-plane box clipping
        const planes = new Cesium.ClippingPlaneCollection({
          modelMatrix: enu,
          planes: [
            new Cesium.ClippingPlane(new Cesium.Cartesian3(1, 0, 0), -hx),
            new Cesium.ClippingPlane(new Cesium.Cartesian3(-1, 0, 0), -hx),
            new Cesium.ClippingPlane(new Cesium.Cartesian3(0, 1, 0), -hy),
            new Cesium.ClippingPlane(new Cesium.Cartesian3(0, -1, 0), -hy),
            new Cesium.ClippingPlane(new Cesium.Cartesian3(0, 0, 1), -hz),
            new Cesium.ClippingPlane(new Cesium.Cartesian3(0, 0, -1), -hz),
          ],
          unionClippingRegions: false, // intersect = hollow box
          edgeWidth: 1.0,
          edgeColor: Cesium.Color.WHITE,
          enabled: true,
        });

        const globe = viewer.scene.globe;
        const prevBackFace = globe.backFaceCulling;
        const prevSkirts = globe.showSkirts;

        globe.backFaceCulling = true;
        globe.showSkirts = true;
        globe.clippingPlanes = planes;
        viewer.scene.requestRender();

        // Add translucent box entity to visualize the clipping boundary
        const boxEntity = viewer.entities.add({
          position: center,
          orientation: Cesium.Transforms.headingPitchRollQuaternion(center, new Cesium.HeadingPitchRoll()),
          box: {
            dimensions: new Cesium.Cartesian3(hx * 2, hy * 2, hz * 2),
            material: Cesium.Color.WHITE.withAlpha(0.1),
            outline: true,
            outlineColor: Cesium.Color.WHITE,
          },
        });
        viewer.scene.requestRender();
        boxEntityRef.current = boxEntity;

        // 4) Frame the box
        const bs = Cesium.BoundingSphere.fromRectangle3D(rect);
        viewer.camera.viewBoundingSphere(
          bs,
          new Cesium.HeadingPitchRange(0.5, -0.5, bs.radius * 2.5)
        );

        viewer.scene.requestRender();

        // Cleanup
        return () => {
          globe.clippingPlanes?.removeAll();
          globe.clippingPlanes = undefined as any;
          globe.backFaceCulling = prevBackFace;
          globe.showSkirts = prevSkirts;
          viewer.entities.remove(boxEntity);
        };
      } catch (error) {
        console.error('Error in GrandCanyonDrillholeViewer:', error);
      }
    };

    let disposer: (() => void) | undefined;
    setupScene().then((d) => (disposer = d));

    return () => {
      isMounted = false;
      if (disposer) disposer();
      if (viewer && !viewer.isDestroyed()) {
        if (dataSourceRef.current) {
          viewer.dataSources.remove(dataSourceRef.current, true);
        }
        if (eventHandlerRef.current && !eventHandlerRef.current.isDestroyed()) {
            eventHandlerRef.current.destroy();
        }
      }
    };
  }, [ready, viewer, displayMode]);

  return (
    <div className="h-full w-full relative">
        {displayMode === 'lithology' ? (
            <Legend
                title={geospatialViewerLithologyLegendData.title}
                type="categorical"
                items={geospatialViewerLithologyLegendData.items}
                show={true}
            />
        ) : (
            <Legend
                title="Assay (Graphitic Carbon)"
                type="gradient"
                gradient="linear-gradient(to right, hsl(120, 100%, 50%), hsl(0, 100%, 50%))"
                minLabel={assayRange.min.toFixed(2)}
                maxLabel={assayRange.max.toFixed(2)}
                show={true}
            />
        )}
        <TooltipContent data={tooltip} />
    </div>
  );
};

export default GrandCanyonDrillholeViewer;