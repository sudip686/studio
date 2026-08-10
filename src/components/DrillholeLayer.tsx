import { useEffect, useRef, useState } from 'react';
import { useCesium } from '@/contexts/cesium-context';
import { drillholeLocationMapLithologyLegendData, LITHOLOGY_COLORS } from '@/lib/constants';
import { useDataCache, DrillholeSegment } from '@/lib/data-cache';
import { BoreholeCylinderCache, Interval, Style } from '@/lib/boreholes/borehole-cylinders';
import { colorFromLegend } from '@/lib/boreholes/legend-color';
import { DrillholeTooltip } from './ui/tooltip';

interface DrillholeLayerProps {
  type: 'lithology' | 'assay';
  presentationMode?: boolean;
  showContextBoundary?: boolean;
  visualProfile?: 'default' | 'presentationClarity';
}

const VISUAL_PROFILES = {
  default: {
    assayRadius: 2.5,
    lithologyRadius: 2.5,
    outline: false,
    outlineColorCss: '#ffffff',
    creationSlices: 32,
    lightenLithology: 0,
    seatBelowTerrain: true,
    terrainSeatSamples: 2,
    terrainSeatNudgeMeters: 1.5,
  },
  presentationClarity: {
    assayRadius: 3.2,
    lithologyRadius: 3.15,
    outline: false,
    outlineColorCss: '#082f49',
    creationSlices: 16,
    lightenLithology: 0,
    seatBelowTerrain: true,
    terrainSeatSamples: 2,
    terrainSeatNudgeMeters: 1.5,
  },
} as const;

function collectKmlPositions(kmlDataSource: any, time: any) {
  if (!kmlDataSource) return [] as any[];

  const positions: any[] = [];
  for (const entity of kmlDataSource.entities.values) {
    const hierarchy = entity.polygon?.hierarchy?.getValue?.(time);
    if (!hierarchy) continue;

    const visit = (node: any) => {
      const ring = Array.isArray(node?.positions) ? node.positions : Array.isArray(node) ? node : [];
      if (ring.length > 0) {
        positions.push(...ring);
      }
      for (const hole of node?.holes ?? []) {
        visit(hole);
      }
    };

    visit(hierarchy);
  }

  return positions;
}

const DrillholeLayer = ({
  type,
  presentationMode = false,
  showContextBoundary = true,
  visualProfile = 'default',
}: DrillholeLayerProps) => {
  const { viewer, ready, kmlDataSource, kmlLabel } = useCesium();
  const { drillholeData, processedAssayData, processedLithologyData } = useDataCache();
  const assayRange = processedAssayData?.assayRange ?? { min: 0, max: 1 };
  const [tooltip, setTooltip] = useState<{ display: boolean; top: number; left: number; content: any }>({
    display: false,
    top: 0,
    left: 0,
    content: null,
  });

  const cacheRef = useRef<BoreholeCylinderCache | null>(null);
  const intervalsRef = useRef<Interval[]>([]);
  const entitiesRef = useRef<any[]>([]);
  const profile = VISUAL_PROFILES[visualProfile];

  const fitCameraToVisibleData = (entities: any[]) => {
    if (!viewer || entities.length === 0) return;

    const Cesium = (window as any).Cesium;
    const time = viewer.clock.currentTime;
    const positions = entities
      .filter((entity) => entity?.show)
      .map((entity) => entity.position?.getValue?.(time))
      .filter(Boolean);

    if (showContextBoundary) {
      positions.push(...collectKmlPositions(kmlDataSource, time));
    }

    if (positions.length === 0) return;

    const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);
    const range = Math.max(4800, Math.min(18000, boundingSphere.radius * 3.05));

    viewer.camera.flyToBoundingSphere(boundingSphere, {
      duration: 1.8,
      offset: new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(20),
        Cesium.Math.toRadians(-52),
        range
      ),
    });
  };

  const applyStyles = (entities = entitiesRef.current) => {
    if (!cacheRef.current || !intervalsRef.current.length || !viewer) return;

    const Cesium = (window as any).Cesium;
    const cache = cacheRef.current;
    const legend = LITHOLOGY_COLORS;
    const legendMap = processedLithologyData?.legendMap ?? LITHOLOGY_COLORS.map;

    const outlineColor = Cesium.Color.fromCssColorString(profile.outlineColorCss);
    const defaultStyle: Style = {
      material: Cesium.Color.GREY,
      opacity: 1.0,
      outline: profile.outline,
      outlineColor,
      radiusMeters: type === 'assay' ? profile.assayRadius : profile.lithologyRadius,
      slices: profile.creationSlices,
    };

    const visibleEntities: any[] = [];

    for (const interval of intervalsRef.current) {
      const entity = viewer.entities.getById(`bh-${interval.id}`);
      if (!entity) continue;

      let styleToApply: Style | null = null;
      let visible = false;

      if (type === 'assay') {
        const value = interval.props?.graphitic_carbon;
        if (value !== undefined && value !== null) {
          const t = assayRange.max > assayRange.min
            ? (value - assayRange.min) / (assayRange.max - assayRange.min)
            : 0.5;
          const clamped = Math.max(0, Math.min(1, t));
          styleToApply = {
            material: new Cesium.Color(clamped, 1 - clamped, 0, 1),
            opacity: 1.0,
            outline: profile.outline,
            outlineColor,
            radiusMeters: profile.assayRadius,
            slices: profile.creationSlices,
          };
          visible = true;
        }
      } else {
        const value = interval.props?.lithology;
        if (value) {
          const normalizedValue = String(value).trim().toLowerCase().replace(/\s+/g, ' ');
          if (legendMap[normalizedValue]) {
            const baseColor = colorFromLegend({ ...legend, map: legendMap }, normalizedValue);
            const color =
              profile.lightenLithology > 0
                ? Cesium.Color.lerp(baseColor, Cesium.Color.WHITE, profile.lightenLithology, new Cesium.Color())
                : baseColor;
            styleToApply = {
              material: color,
              opacity: 1.0,
              outline: profile.outline,
              outlineColor,
              radiusMeters: profile.lithologyRadius,
              slices: profile.creationSlices,
            };
            visible = true;
          } else if (normalizedValue === 'unknown' || normalizedValue === 'nan') {
            styleToApply = defaultStyle;
            visible = true;
          }
        }
      }

      entity.show = visible;
      if (visible && styleToApply) {
        cache.applyStyle(entity, styleToApply);
        visibleEntities.push(entity);
      }
    }

    if (!presentationMode) {
      fitCameraToVisibleData(visibleEntities.length > 0 ? visibleEntities : entities);
    }
    viewer.scene.requestRender();
  };

  useEffect(() => {
    if (!viewer || !ready || !drillholeData) return;
    let isCancelled = false;

    cacheRef.current = new BoreholeCylinderCache(viewer);
    const cache = cacheRef.current;
    const allSegments = [...(drillholeData.lithology || []), ...(drillholeData.assay || [])];
    const holes: Record<string, DrillholeSegment[]> = {};

    for (const seg of allSegments) {
      if (!holes[seg.hole_id]) holes[seg.hole_id] = [];
      holes[seg.hole_id].push(seg);
    }

    const uniqueIntervals = new Map<string, Interval>();
    const Cesium = (window as any).Cesium;

    Object.values(holes).forEach((segments) => {
      segments.sort((a, b) => a.depth_from - b.depth_from);
      if (segments.length === 0) return;

      const firstSeg = segments[0];
      const geometry = firstSeg.feature?.geometry;
      if (!geometry || geometry.type !== 'LineString' || geometry.coordinates.length < 1) return;

      const [startLon, startLat, startElev] = geometry.coordinates[0];
      let currentPos = Cesium.Cartesian3.fromDegrees(startLon, startLat, startElev);

      segments.forEach((seg) => {
        const props = seg.feature?.properties || {};
        const azimuth = Number(props.azimuth ?? 0);
        const inclination = Number(props.inclination ?? 0);
        const depthFrom = props.depth_from ?? 0;
        const depthTo = props.depth_to ?? 0;
        const len = Math.abs(depthTo - depthFrom);
        if (len <= 0) return;

        const incRad = Cesium.Math.toRadians(inclination);
        const azRad = Cesium.Math.toRadians(azimuth);
        const verticalComponent = -Math.cos(incRad);
        const horizontalComponent = Math.sin(incRad);
        const localDirection = new Cesium.Cartesian3(
          horizontalComponent * Math.sin(azRad),
          horizontalComponent * Math.cos(azRad),
          verticalComponent
        );

        const enuToFixed = Cesium.Transforms.eastNorthUpToFixedFrame(currentPos);
        const rotationMatrix = Cesium.Matrix4.getMatrix3(enuToFixed, new Cesium.Matrix3());
        const fixedDirection = Cesium.Matrix3.multiplyByVector(
          rotationMatrix,
          localDirection,
          new Cesium.Cartesian3()
        );
        Cesium.Cartesian3.normalize(fixedDirection, fixedDirection);

        const nextPos = new Cesium.Cartesian3();
        Cesium.Cartesian3.add(
          currentPos,
          Cesium.Cartesian3.multiplyByScalar(fixedDirection, len, new Cesium.Cartesian3()),
          nextPos
        );

        const id = `${seg.hole_id}-${depthFrom}-${depthTo}`;
        const startCart = Cesium.Cartographic.fromCartesian(currentPos);
        const endCart = Cesium.Cartographic.fromCartesian(nextPos);

        const interval: Interval = {
          id,
          start: [
            Cesium.Math.toDegrees(startCart.latitude),
            Cesium.Math.toDegrees(startCart.longitude),
            startCart.height,
          ],
          end: [
            Cesium.Math.toDegrees(endCart.latitude),
            Cesium.Math.toDegrees(endCart.longitude),
            endCart.height,
          ],
          props: {
            ...seg,
            latitude: Cesium.Math.toDegrees(startCart.latitude),
            longitude: Cesium.Math.toDegrees(startCart.longitude),
          },
        };

        if (uniqueIntervals.has(id)) {
          const existing = uniqueIntervals.get(id)!;
          if (seg.graphitic_carbon !== undefined && seg.graphitic_carbon !== null) {
            existing.props = { ...existing.props, graphitic_carbon: seg.graphitic_carbon };
          }
          if (seg.lithology) {
            existing.props = { ...existing.props, lithology: seg.lithology };
          }
        } else {
          uniqueIntervals.set(id, interval);
        }

        currentPos = nextPos;
      });
    });

    intervalsRef.current = Array.from(uniqueIntervals.values());

    const run = async () => {
      const BATCH_SIZE = 200;
      const total = intervalsRef.current.length;
      const entitiesCreated: any[] = [];

      viewer.entities.suspendEvents();

      for (let i = 0; i < total; i += BATCH_SIZE) {
        if (isCancelled) break;

        const batch = intervalsRef.current.slice(i, i + BATCH_SIZE);
        const creationStyle: Style = {
          material: Cesium.Color.GREY,
          opacity: 0.0,
          outline: false,
          radiusMeters: type === 'assay' ? profile.assayRadius : profile.lithologyRadius,
          slices: profile.creationSlices,
          seatBelowTerrain: profile.seatBelowTerrain,
          terrainSeatSamples: profile.terrainSeatSamples,
          terrainSeatNudgeMeters: profile.terrainSeatNudgeMeters,
        };

        const newEntities = await Promise.all(
          batch.map((interval) => cache.getOrCreate(interval, creationStyle))
        );

        newEntities.forEach((entity) => {
          if (entity) {
            entity.show = false;
            entitiesCreated.push(entity);
          }
        });

        viewer.entities.resumeEvents();
        viewer.scene.requestRender();
        await new Promise((resolve) => requestAnimationFrame(resolve));
        viewer.entities.suspendEvents();
      }

      viewer.entities.resumeEvents();
      if (isCancelled) return;

      entitiesRef.current = entitiesCreated;
      applyStyles(entitiesCreated);
    };

    run();

    return () => {
      isCancelled = true;
      cacheRef.current?.destroy();
      cacheRef.current = null;
      entitiesRef.current = [];
    };
  }, [
    viewer,
    ready,
    drillholeData,
    profile.assayRadius,
    profile.creationSlices,
    profile.lithologyRadius,
    profile.seatBelowTerrain,
    profile.terrainSeatNudgeMeters,
    profile.terrainSeatSamples,
    type,
  ]);

  useEffect(() => {
    applyStyles();
  }, [type, assayRange.min, assayRange.max, processedLithologyData?.legendMap, kmlDataSource, presentationMode, profile, showContextBoundary]);

  useEffect(() => {
    if (!kmlDataSource) return;
    if (!showContextBoundary) {
      kmlDataSource.show = false;
      if (kmlLabel) kmlLabel.show = false;
      viewer?.scene?.requestRender?.();
      return;
    }
    kmlDataSource.show = true;
    if (kmlLabel) {
      kmlLabel.show = false;
    }
    viewer?.scene?.requestRender?.();
  }, [kmlDataSource, kmlLabel, showContextBoundary, viewer]);

  useEffect(() => {
    if (!viewer || !ready) return;
    const Cesium = (window as any).Cesium;
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction((movement: any) => {
      const picked = viewer.scene.pick(movement.endPosition);

      if (picked?.id?.properties) {
        setTooltip({
          display: true,
          top: movement.endPosition.y,
          left: movement.endPosition.x,
          content: picked.id.properties.getValue(viewer.clock.currentTime),
        });
      } else {
        setTooltip({ display: false, top: 0, left: 0, content: null });
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    const removePreRender = viewer.scene.preRender.addEventListener(() => {
      // Scene updates handled by Cesium natively.
    });

    return () => {
      if (!handler.isDestroyed()) handler.destroy();
      removePreRender();
    };
  }, [viewer, ready]);

  return (
    <div className="h-full w-full relative z-20 pointer-events-none">
      <DrillholeTooltip data={tooltip} />
    </div>
  );
};

export default DrillholeLayer;



