import { useEffect, useRef } from 'react';

interface DrillholeLayerProps {
    viewer: any;
    type: 'lithology' | 'assay';
}

const LITHOLOGY_COLOR_MAP: { [key: string]: string } = {
    "Quartz-Feldspathic": "#d39127ff",
    "GRSC": "#19292aff",
    "Granulite": "#a1089aff",
    "Khondalite": "#4f1dc4ff",
    "Marble": "#D4E6F1",
    "Not Recovearble": "#515A5A",
    "SOIL": "#2df27cff",
    "Schist": "#153224ff",
    "nan": "#ffffffbe",
    "UNKNOWN": "#cccccc",
};

const DrillholeLayer = ({ viewer, type }: DrillholeLayerProps) => {
    const dataSourceRef = useRef<any>(null);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return;

        const Cesium = window.Cesium;
        let isMounted = true;

        const loadDrillholes = async () => {
            const geojsonPath = type === 'lithology' ? '/lithology_data.geojson' : '/assay_data.geojson';
            try {
                const dataSource = await Cesium.GeoJsonDataSource.load(geojsonPath, {
                    strokeWidth: 2,
                });

                if (isMounted && viewer && !viewer.isDestroyed()) {
                    dataSourceRef.current = dataSource;
                    viewer.dataSources.add(dataSource);

                    const entities = dataSource.entities.values;
                    for (let i = 0; i < entities.length; i++) {
                        const entity = entities[i];
                        const properties = entity.properties;

                        if (properties &&
                            properties.depth_from && properties.depth_to && properties.hole_id &&
                            properties.longitude && properties.latitude && properties.z &&
                            (type === 'lithology' ? properties.lithology : properties.graphitic_carbon)
                        ) {
                            const depthFrom = properties.depth_from.getValue();
                            const depthTo = properties.depth_to.getValue();
                            const colorValue = type === 'lithology' ? properties.lithology.getValue() : properties.graphitic_carbon.getValue();

                            const startPosition = entity.position.getValue(Cesium.JulianDate.now());
                            const endPosition = Cesium.Cartesian3.fromDegrees(properties.longitude.getValue(), properties.latitude.getValue(), properties.z.getValue() - depthTo);

                            const segmentLength = Cesium.Cartesian3.distance(startPosition, endPosition);
                            const midPoint = Cesium.Cartesian3.midpoint(startPosition, endPosition, new Cesium.Cartesian3());

                            const cylinderColor = type === 'lithology'
                                ? Cesium.Color.fromCssColorString(LITHOLOGY_COLOR_MAP[colorValue] || LITHOLOGY_COLOR_MAP["UNKNOWN"])
                                : Cesium.Color.fromHsl((120 - (colorValue / 100) * 120) / 360, 1.0, 0.5);

                            viewer.entities.add({
                                position: midPoint,
                                cylinder: {
                                    length: segmentLength,
                                    topRadius: 1.0,
                                    bottomRadius: 1.0,
                                    material: cylinderColor.withAlpha(0.8),
                                    heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
                                },
                                orientation: Cesium.Transforms.headingPitchRollQuaternion(
                                    midPoint,
                                    Cesium.HeadingPitchRoll.fromPoints(startPosition, endPosition)
                                ),
                                properties: properties, // Attach original properties for tooltip
                            });
                        }
                    }
                    viewer.flyTo(dataSource);
                }
            } catch (error) {
                console.error(`Error loading drillhole data (${type}):`, error);
            }
        };

        loadDrillholes();

        return () => {
            isMounted = false;
            if (viewer && !viewer.isDestroyed() && dataSourceRef.current) {
                viewer.dataSources.remove(dataSourceRef.current, true);
                dataSourceRef.current = null;
            }
        };
    }, [viewer, type]);

    return null;
};

export default DrillholeLayer;
