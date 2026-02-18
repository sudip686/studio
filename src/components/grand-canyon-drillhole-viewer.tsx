'use client';

import { useEffect, useRef, useState } from 'react';
import { useCesium } from '@/contexts/cesium-context';
import { Legend } from '@/components/ui/legend';
import { LITHOLOGY_COLOR_MAP_CSS, geospatialViewerLithologyLegendData, ASSET_BASE_URL } from '@/lib/constants';
import * as Cesium from 'cesium';

interface GrandCanyonDrillholeViewerProps {
  displayMode: 'assay' | 'lithology';
}

// Generic tooltip from resource-model-viewer
const TooltipContent = ({ data }: { data: any }) => {
    if (!data || !data.content) return null;
    const propertyEntries = Object.entries(data.content).map(([key, value]) => {
        const displayValue = typeof value === 'number' ? value.toFixed(3) : String(value);
        return <li key={key}><strong>{key}:</strong> {displayValue}</li>;
    });
    return (
        <div
            className="absolute bg-gray-800 text-white p-3 rounded-md shadow-lg text-xs pointer-events-none z-50"
            style={{ top: data.top, left: data.left, transform: 'translate(15px, 15px)' }}
        >
            <p className="font-bold text-base mb-1">Entity Properties</p>
            <ul className="list-none space-y-1">{propertyEntries}</ul>
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

  // State from resource-model-viewer
  const [blockModelData, setBlockModelData] = useState<any>(null);
  const [properties, setProperties] = useState<string[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [blockTransparency, setBlockTransparency] = useState(0.5);
  const blockModelEntitiesRef = useRef<any[]>([]);

  useEffect(() => {
    if (!ready || !viewer) return;
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
        
        const [geoJson, bm] = await Promise.all([
            fetch(geojsonPath).then(res => res.json()),
            fetch(`${ASSET_BASE_URL}/BlockModel.geojson`).then(res => res.json())
        ]);

        if (!isMounted) return;

        // Process and set block model data
        setBlockModelData(bm);
        const keys = Object.keys(bm?.features?.[0]?.properties ?? {});
        setProperties(keys);
        const preferred = keys.includes("Kr, GRAPHITIC_CARBON in GM_Litho: GRSC")
            ? "Kr, GRAPHITIC_CARBON in GM_Litho: GRSC"
            : (keys.includes("RescCalc") ? "RescCalc" : keys[0] ?? "");
        setSelectedProperty(preferred);

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

                const up = Cesium.Cartesian3.normalize(midpoint, new Cesium.Cartesian3());
                const right = Cesium.Cartesian3.cross(direction, up, new Cesium.Cartesian3());
                Cesium.Cartesian3.normalize(right, right);
                const newUp = Cesium.Cartesian3.cross(right, direction, new Cesium.Cartesian3());
                Cesium.Cartesian3.normalize(newUp, newUp);

                const rotation = new Cesium.Matrix3(
                    right.x, newUp.x, direction.x,
                    right.y, newUp.y, direction.y,
                    right.z, newUp.z, direction.z
                );

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
        dataSourceRef.current = customDataSource;

        // 2) Load KMZ boundary to compute box clipping planes
        const ds = await Cesium.KmlDataSource.load(kmzUrl, { clampToGround: true });
        await viewer.dataSources.add(ds);
        await viewer.flyTo(ds);

        const rect = viewer.camera.computeViewRectangle();
        if (!rect) return;

        const centerCarto = Cesium.Rectangle.center(rect);
        const center = Cesium.Cartesian3.fromRadians(
          centerCarto.longitude,
          centerCarto.latitude,
          0
        );
        const enu = Cesium.Transforms.eastNorthUpToFixedFrame(center);

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
        const hz = Math.max(hx, hy) * 1.2;

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
          unionClippingRegions: false,
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
        boxEntityRef.current = boxEntity;

        const bs = Cesium.BoundingSphere.fromRectangle3D(rect);
        viewer.camera.viewBoundingSphere(
          bs,
          new Cesium.HeadingPitchRange(0.5, -0.5, bs.radius * 2.5)
        );

        viewer.scene.requestRender();

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

  // Effect for rendering block model
  useEffect(() => {
    if (!viewer || !blockModelData || !selectedProperty) return;

    blockModelEntitiesRef.current.forEach(entity => viewer.entities.remove(entity));
    blockModelEntitiesRef.current = [];

    let min = Infinity, max = -Infinity;
    if (selectedProperty === "Kr, GRAPHITIC_CARBON in GM_Litho: GRSC") {
        blockModelData.features.forEach((f:any) => {
            const v = parseFloat(f.properties[selectedProperty]);
            if (!isNaN(v)) { if (v < min) min = v; if (v > max) max = v; }
        });
    }

    blockModelData.features.forEach((feature: any) => {
        const { geometry, properties } = feature;
        let color;
        let shouldPlot = false;

        if (selectedProperty === "Kr, GRAPHITIC_CARBON in GM_Litho: GRSC") {
            const value = parseFloat(properties[selectedProperty]);
            if (!isNaN(value)) {
                shouldPlot = true;
                const ratio = max > min ? (value - min) / (max - min) : 0.5;
                color = Cesium.Color.fromHsl(0.6 - ratio * 0.6, 1.0, 0.5).withAlpha(blockTransparency);
            }
        } else if (selectedProperty === "RescCalc") {
            const value = properties[selectedProperty];
            if (["Indicated", "Measured", "Inferred"].includes(value)) {
                shouldPlot = true;
                switch (value) {
                    case "Indicated": color = Cesium.Color.BLUE.withAlpha(blockTransparency); break;
                    case "Measured": color = Cesium.Color.GREEN.withAlpha(blockTransparency); break;
                    case "Inferred": color = Cesium.Color.YELLOW.withAlpha(blockTransparency); break;
                }
            }
        }

        if (shouldPlot) {
            const { dX, dY, dZ } = properties;
            const entity = viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(geometry.coordinates[0], geometry.coordinates[1], geometry.coordinates[2]),
                box: { dimensions: new Cesium.Cartesian3(parseFloat(dX), parseFloat(dY), parseFloat(dZ)), material: color },
                properties: properties
            });
            blockModelEntitiesRef.current.push(entity);
        }
    });
    viewer.scene.requestRender();

    return () => {
        if (viewer && !viewer.isDestroyed()) {
            blockModelEntitiesRef.current.forEach(entity => viewer.entities.remove(entity));
            blockModelEntitiesRef.current = [];
        }
    };
  }, [viewer, blockModelData, selectedProperty, blockTransparency]);

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
        <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.8)', padding: '10px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px', borderRadius: '8px' }}>
            <h4>Resource Model Controls</h4>
            <div>
                <label>Visualize Property: </label>
                <select value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)} style={{width: "100%"}}>
                    {properties.map(prop => <option key={prop} value={prop}>{prop}</option>)}
                </select>
            </div>
            <div>
                <label>Block Transparency: </label>
                <input type="range" min="0" max="1" step="0.05" value={blockTransparency} onChange={(e) => setBlockTransparency(parseFloat(e.target.value))} />
            </div>
        </div>
    </div>
  );
};

export default GrandCanyonDrillholeViewer;
