'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Compass, Crosshair, Eye, EyeOff, Home, Layers, Map, Mountain, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { CompassOverlay } from '@/components/ui/CompassOverlay';
import { MetricScaleOverlay } from '@/components/ui/MetricScaleOverlay';
import { useCesium } from '@/contexts/cesium-context';
import { useSubsurface } from '@/contexts/subsurface-context';
import { OverlaySlot } from '@/ui/overlays';

type CameraPreset = 'home' | 'top' | 'oblique' | 'section';

type LayerToggle = {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

const panelClass =
  'pointer-events-auto overflow-hidden rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,rgba(9,13,20,0.94),rgba(8,10,14,0.82))] text-white shadow-[0_22px_56px_rgba(0,0,0,0.42)] backdrop-blur-xl';

const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f1d2bf]/62';

function getCesium() {
  return typeof window !== 'undefined' ? (window as any).Cesium : undefined;
}

function useCesiumCameraTools() {
  const { viewer } = useCesium();
  const [autoRotate, setAutoRotate] = useState(false);

  const requestRender = useCallback(() => {
    if (viewer && !viewer.isDestroyed()) viewer.scene.requestRender();
  }, [viewer]);

  const frameScene = useCallback(
    async (preset: CameraPreset = 'oblique') => {
      if (!viewer || viewer.isDestroyed()) return;
      const Cesium = getCesium();
      if (!Cesium) return;

      const entities = viewer.entities.values;
      const dataSourceEntities: any[] = [];
      if (viewer.dataSources) {
        for (let index = 0; index < viewer.dataSources.length; index += 1) {
          const source = viewer.dataSources.get(index);
          dataSourceEntities.push(...(source.entities?.values ?? []));
        }
      }
      const positions: any[] = [];

      [...entities, ...dataSourceEntities].forEach((entity: any) => {
        try {
          const time = viewer.clock.currentTime;
          const position = entity.position?.getValue?.(time);
          if (position) positions.push(position);
          const polylinePositions = entity.polyline?.positions?.getValue?.(time);
          if (Array.isArray(polylinePositions)) positions.push(...polylinePositions);
        } catch {
          // Keep camera controls resilient when a Cesium entity has lazy properties.
        }
      });

      let sphere: any;
      if (positions.length > 1) {
        sphere = Cesium.BoundingSphere.fromPoints(positions);
      } else {
        const cartographic = viewer.camera.positionCartographic;
        const fallback = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0);
        sphere = new Cesium.BoundingSphere(fallback, 1800);
      }

      const radius = Math.max(sphere.radius || 1000, 800);
      const pitch =
        preset === 'top'
          ? Cesium.Math.toRadians(-89)
          : preset === 'section'
            ? Cesium.Math.toRadians(-12)
            : Cesium.Math.toRadians(-36);
      const heading =
        preset === 'section'
          ? Cesium.Math.toRadians(88)
          : preset === 'home'
            ? Cesium.Math.toRadians(20)
            : viewer.camera.heading;
      const range =
        preset === 'top'
          ? radius * 2.45
          : preset === 'section'
            ? radius * 1.75
            : radius * 2.1;

      await viewer.camera.flyToBoundingSphere(sphere, {
        duration: 0.9,
        offset: new Cesium.HeadingPitchRange(heading, pitch, range),
      });
      requestRender();
    },
    [requestRender, viewer]
  );

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;
    const controller = viewer.scene.screenSpaceCameraController;
    controller.enableInputs = true;
    controller.enableRotate = true;
    controller.enableTranslate = true;
    controller.enableZoom = true;
    controller.enableTilt = true;
    controller.enableLook = true;
    controller.inertiaSpin = 0.72;
    controller.inertiaTranslate = 0.78;
    controller.inertiaZoom = 0.74;
    requestRender();
  }, [requestRender, viewer]);

  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !autoRotate) return;
    const Cesium = getCesium();
    if (!Cesium) return;

    const rotate = () => {
      viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.0014);
      viewer.scene.requestRender();
    };

    viewer.clock.onTick.addEventListener(rotate);
    return () => viewer.clock.onTick.removeEventListener(rotate);
  }, [autoRotate, viewer]);

  const getHeading = useCallback(() => {
    if (!viewer || viewer.isDestroyed()) return 0;
    return viewer.camera.heading;
  }, [viewer]);

  const getMetersIn100px = useCallback(() => {
    if (!viewer || viewer.isDestroyed()) return 1000;
    const Cesium = getCesium();
    const scene = viewer.scene;
    const camera = scene.camera;
    const canvas = scene.canvas;
    if (!Cesium || !camera || !canvas?.clientHeight) return 1000;

    const center = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
    const ray = camera.getPickRay(center);
    const intersection = ray ? scene.globe.pick(ray, scene) : undefined;
    const distance = Cesium.defined(intersection)
      ? Cesium.Cartesian3.distance(camera.positionWC, intersection)
      : Math.max(camera.positionCartographic?.height ?? 1000, 1000);
    const fovy = (camera.frustum as any)?.fovy ?? Cesium.Math.toRadians(60);
    const metersPerPixel = (2 * distance * Math.tan(fovy / 2)) / canvas.clientHeight;
    return Number.isFinite(metersPerPixel) && metersPerPixel > 0 ? metersPerPixel * 100 : 1000;
  }, [viewer]);

  return { autoRotate, setAutoRotate, frameScene, getHeading, getMetersIn100px };
}

function ViewerToolbar({
  title,
  subtitle,
  autoRotate,
  onAutoRotateChange,
  onPreset,
}: {
  title: string;
  subtitle: string;
  autoRotate: boolean;
  onAutoRotateChange: (value: boolean) => void;
  onPreset: (preset: CameraPreset) => void;
}) {
  const buttons = [
    { label: 'Home', icon: Home, preset: 'home' as const },
    { label: 'Top', icon: Map, preset: 'top' as const },
    { label: 'Oblique', icon: Mountain, preset: 'oblique' as const },
    { label: 'Section', icon: Crosshair, preset: 'section' as const },
  ];

  return (
    <div className={`${panelClass} max-w-[calc(100vw-2rem)] px-3 py-2.5`} data-no-deck-wheel>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[13rem] pr-1">
          <div className={labelClass}>3D workspace</div>
          <div className="mt-1 text-[0.95rem] font-semibold leading-tight tracking-[-0.01em] text-white">{title}</div>
          <div className="mt-0.5 text-[11px] leading-4 text-white/56">{subtitle}</div>
        </div>

        <div className="h-10 w-px bg-white/10" />

        <div className="flex items-center gap-1.5">
          {buttons.map(({ label, icon: Icon, preset }) => (
            <Button
              key={label}
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-[12px]"
              title={label}
              aria-label={label}
              onClick={() => onPreset(preset)}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>

        <div className="h-10 w-px bg-white/10" />

        <Button
          type="button"
          variant={autoRotate ? 'default' : 'outline'}
          size="sm"
          className="h-9 rounded-[12px] px-3"
          onClick={() => onAutoRotateChange(!autoRotate)}
        >
          {autoRotate ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          <span>{autoRotate ? 'Pause' : 'Rotate'}</span>
        </Button>
      </div>
    </div>
  );
}

function LayerPanel({
  title,
  subtitle,
  layers,
}: {
  title: string;
  subtitle: string;
  layers: LayerToggle[];
}) {
  return (
    <div className={`${panelClass} w-[19rem] max-w-[calc(100vw-2rem)] p-3.5`} data-no-deck-wheel>
      <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <div className={labelClass}>Layers</div>
          <div className="mt-1 text-sm font-semibold text-white">{title}</div>
          <p className="mt-1 text-[11px] leading-4 text-white/56">{subtitle}</p>
        </div>
        <Layers className="mt-1 h-4 w-4 text-[#f1d2bf]/70" />
      </div>

      <div className="mt-3 space-y-2">
        {layers.map((layer) => (
          <label
            key={layer.id}
            className="flex items-center justify-between gap-3 rounded-[14px] border border-white/8 bg-white/[0.045] px-3 py-2 text-[12px] text-white/82"
          >
            <span className="flex items-center gap-2">
              {layer.checked ? <Eye className="h-3.5 w-3.5 text-[#f1d2bf]" /> : <EyeOff className="h-3.5 w-3.5 text-white/38" />}
              {layer.label}
            </span>
            <Switch checked={layer.checked} onCheckedChange={layer.onCheckedChange} aria-label={layer.label} />
          </label>
        ))}
      </div>
    </div>
  );
}

export function CesiumSceneUtilities({
  title,
  subtitle,
  showToolbar = true,
}: {
  title: string;
  subtitle: string;
  showToolbar?: boolean;
}) {
  const { autoRotate, setAutoRotate, frameScene, getHeading, getMetersIn100px } = useCesiumCameraTools();

  return (
    <>
      {showToolbar ? (
        <OverlaySlot slot="top-center">
          <ViewerToolbar
            title={title}
            subtitle={subtitle}
            autoRotate={autoRotate}
            onAutoRotateChange={setAutoRotate}
            onPreset={frameScene}
          />
        </OverlaySlot>
      ) : null}

      <OverlaySlot slot="top-right">
        <div className="flex flex-col items-end gap-3">
          <CompassOverlay mode="cesium" getHeading={getHeading} headingUnit="radians" className="scale-[0.82] origin-top-right" />
          <MetricScaleOverlay mode="cesium" getMetersIn100px={getMetersIn100px} className="scale-[0.88] origin-top-right" />
        </div>
      </OverlaySlot>
    </>
  );
}

export function DrillholeViewerHud({
  mode,
  showCollars,
  showTraces,
  onShowCollarsChange,
  onShowTracesChange,
}: {
  mode: 'assay' | 'lithology';
  showCollars: boolean;
  showTraces: boolean;
  onShowCollarsChange: (checked: boolean) => void;
  onShowTracesChange: (checked: boolean) => void;
}) {
  const layers = useMemo<LayerToggle[]>(
    () => [
      { id: 'terrain', label: 'Terrain surface', checked: true, onCheckedChange: () => undefined },
      { id: 'collars', label: 'Drill collars', checked: showCollars, onCheckedChange: onShowCollarsChange },
      { id: 'traces', label: mode === 'assay' ? 'Assay traces' : 'Lithology traces', checked: showTraces, onCheckedChange: onShowTracesChange },
    ],
    [mode, onShowCollarsChange, onShowTracesChange, showCollars, showTraces]
  );

  return (
    <>
      <CesiumSceneUtilities title="Drillhole scene" subtitle="Surface, collars, assays, and subsurface section control." />
      <OverlaySlot slot="top-left">
        <LayerPanel title="Drillhole layers" subtitle="Keep the scene readable while inspecting intervals." layers={layers} />
      </OverlaySlot>
    </>
  );
}

function ResourceLayerPanel() {
  const {
    transparency,
    setTransparency,
    showBoreholes,
    setShowBoreholes,
    showBlockModel,
    setShowBlockModel,
    clippingMode,
    setClippingMode,
    clippingRadius,
    setClippingRadius,
  } = useSubsurface();

  const layers = useMemo<LayerToggle[]>(
    () => [
      { id: 'surface', label: 'Terrain surface', checked: true, onCheckedChange: () => undefined },
      { id: 'blocks', label: 'Resource blocks', checked: showBlockModel, onCheckedChange: setShowBlockModel },
      { id: 'boreholes', label: 'Borehole traces', checked: showBoreholes, onCheckedChange: setShowBoreholes },
      {
        id: 'clip',
        label: 'Clipping plane',
        checked: clippingMode !== 'none',
        onCheckedChange: (checked) => setClippingMode(checked ? 'elevation' : 'none'),
      },
    ],
    [clippingMode, setClippingMode, setShowBlockModel, setShowBoreholes, showBlockModel, showBoreholes]
  );

  return (
    <div className="flex flex-col gap-3">
      <LayerPanel title="Resource view" subtitle="Inspect blocks, boreholes, and clipping state." layers={layers} />
      <div className={`${panelClass} w-[19rem] max-w-[calc(100vw-2rem)] p-3.5`} data-no-deck-wheel>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className={labelClass}>Model tuning</div>
            <div className="mt-1 text-sm font-semibold text-white">Block display</div>
          </div>
          <Box className="h-4 w-4 text-[#f1d2bf]/70" />
        </div>

        <div className="mt-3 space-y-4">
          <label className="block">
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/70">
              <span>Opacity</span>
              <span>{Math.round(transparency * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.15"
              max="1"
              step="0.05"
              value={transparency}
              onChange={(event) => setTransparency(parseFloat(event.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/12 accent-[#e6743b]"
            />
          </label>

          <label className="block">
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/70">
              <span>Clip height</span>
              <span>{Math.round(clippingRadius)} m</span>
            </div>
            <input
              type="range"
              min="-500"
              max="500"
              step="10"
              value={clippingRadius}
              disabled={clippingMode === 'none'}
              onChange={(event) => setClippingRadius(parseFloat(event.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/12 accent-[#e6743b] disabled:cursor-not-allowed disabled:opacity-40"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export function ResourceViewerHud() {
  return (
    <>
      <CesiumSceneUtilities title="Resource estimation" subtitle="Block model, boreholes, classification, and clipping controls." />
      <OverlaySlot slot="top-left">
        <ResourceLayerPanel />
      </OverlaySlot>
    </>
  );
}

export function SceneModePill({ label, detail }: { label: string; detail: string }) {
  return (
    <div className={`${panelClass} px-3 py-2`} data-no-deck-wheel>
      <div className="flex items-center gap-2">
        <Compass className="h-4 w-4 text-[#f1d2bf]" />
        <div>
          <div className={labelClass}>{label}</div>
          <div className="mt-0.5 text-[11px] text-white/66">{detail}</div>
        </div>
      </div>
    </div>
  );
}
