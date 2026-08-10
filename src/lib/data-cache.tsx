'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { LITHOLOGY_COLOR_MAP } from '@/lib/boreholes/colors';

type ResourceStatus = 'idle' | 'loading' | 'success' | 'error';
type CacheResourceKey = 'lithology' | 'assay' | 'blockModel';
type DataCacheContextValue = DataCache & {
  refetch: () => void;
  loadBlockModel: () => void;
};
type FetchJsonOptions = {
  label: string;
  candidates: string[];
  attempts?: number;
  timeoutMs?: number;
  validate?: (payload: any) => boolean;
};

const DEFAULT_MODEL_CENTER = { lon: 0, lat: 0 };
const REMOTE_ASSET_BASE_URL = process.env.NEXT_PUBLIC_ASSET_BASE_URL?.replace(/\/$/, '') ?? '';
const GEOJSON_FETCH_ATTEMPTS = 2;
const GEOJSON_FETCH_TIMEOUT_MS = 7000;

export interface DrillholeSegment {
  lon: number;
  lat: number;
  elevation: number;
  depth_from: number;
  depth_to: number;
  hole_id: string;
  lithology?: string;
  graphitic_carbon?: number;
  feature: any;
}

export interface BlockSegment {
  lon: number;
  lat: number;
  elevation: number;
  Id: string;
  dX: number;
  dY: number;
  dZ: number;
  'Kr, GRAPHITIC_CARBON in GM_Litho: GRSC'?: string | number;
  RescCalc?: string;
  feature: any;
}

interface BoreholeInfo {
  segments: DrillholeSegment[];
  orientation: {
    midpoint: { x: number; y: number; z: number };
    quaternion: { x: number; y: number; z: number; w: number };
    length: number;
  } | null;
  length: number;
}

interface ProcessedLithologyData {
  byHoleId: Record<string, BoreholeInfo>;
  modelCenter: { lon: number; lat: number };
  grouped?: Record<string, DrillholeSegment[]>;
  legendItems: { label: string; color: string }[];
  legendMap: Record<string, string>;
}

interface ProcessedAssayData {
  byHoleId: Record<string, BoreholeInfo>;
  modelCenter: { lon: number; lat: number };
  assayRange: { min: number; max: number };
  grouped?: Record<string, Array<DrillholeSegment & { colorT: number }>>;
}

interface DataCache {
  drillholeData: {
    lithology: DrillholeSegment[];
    assay: DrillholeSegment[];
  } | null;
  blockModelData: BlockSegment[] | null;
  processedLithologyData: ProcessedLithologyData | null;
  processedAssayData: ProcessedAssayData | null;
  loadingStatus: ResourceStatus;
  error: string | null;
  resourceStatus: Record<CacheResourceKey, ResourceStatus>;
  resourceErrors: Record<CacheResourceKey, string | null>;
  memoryUsage: number;
  dataSize: { lithology: number; assay: number; blockModel: number };
}

type DrillholeDataState = NonNullable<DataCache['drillholeData']>;

const initialResourceStatus: Record<CacheResourceKey, ResourceStatus> = {
  lithology: 'idle',
  assay: 'idle',
  blockModel: 'idle',
};

const initialResourceErrors: Record<CacheResourceKey, string | null> = {
  lithology: null,
  assay: null,
  blockModel: null,
};

const initialState: DataCache = {
  drillholeData: null,
  blockModelData: null,
  processedLithologyData: null,
  processedAssayData: null,
  loadingStatus: 'idle',
  error: null,
  resourceStatus: initialResourceStatus,
  resourceErrors: initialResourceErrors,
  memoryUsage: 0,
  dataSize: { lithology: 0, assay: 0, blockModel: 0 },
};

const resourceCandidates: Record<CacheResourceKey, string[]> = {
  lithology: [
    '/lithology_data.geojson',
    REMOTE_ASSET_BASE_URL ? `${REMOTE_ASSET_BASE_URL}/lithology_data.geojson` : '',
    '/api/lithology-data',
  ].filter(Boolean),
  assay: [
    '/assay_data.geojson',
    REMOTE_ASSET_BASE_URL ? `${REMOTE_ASSET_BASE_URL}/assay_data.geojson` : '',
    '/api/assay-data',
  ].filter(Boolean),
  blockModel: [
    '/BlockModel.geojson',
    REMOTE_ASSET_BASE_URL ? `${REMOTE_ASSET_BASE_URL}/BlockModel.geojson` : '',
    '/api/block-model',
  ].filter(Boolean),
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isGeoJsonFeatureCollection(payload: any) {
  return Boolean(payload && Array.isArray(payload.features));
}

function hasResourceData(cache: DataCache, resource: CacheResourceKey) {
  if (resource === 'lithology') {
    return Boolean(cache.drillholeData?.lithology?.length);
  }
  if (resource === 'assay') {
    return Boolean(cache.drillholeData?.assay?.length);
  }
  return Boolean(cache.blockModelData?.length);
}

function measureDataSize(cache: Pick<DataCache, 'drillholeData' | 'blockModelData'>) {
  return {
    lithology: cache.drillholeData?.lithology?.length ? JSON.stringify(cache.drillholeData.lithology).length : 0,
    assay: cache.drillholeData?.assay?.length ? JSON.stringify(cache.drillholeData.assay).length : 0,
    blockModel: cache.blockModelData?.length ? JSON.stringify(cache.blockModelData).length : 0,
  };
}

function deriveCacheState(next: DataCache): DataCache {
  const dataSize = measureDataSize(next);
  const memoryUsage =
    dataSize.lithology +
    dataSize.assay +
    dataSize.blockModel +
    (next.processedLithologyData ? JSON.stringify(next.processedLithologyData).length : 0) +
    (next.processedAssayData ? JSON.stringify(next.processedAssayData).length : 0);

  const hasAnyData =
    !!next.drillholeData?.lithology?.length ||
    !!next.drillholeData?.assay?.length ||
    !!next.blockModelData?.length;
  const hasPendingResource = Object.values(next.resourceStatus).some(
    (status) => status === 'idle' || status === 'loading'
  );
  const allResourcesSettled = Object.values(next.resourceStatus).every(
    (status) => status === 'success' || status === 'error'
  );
  const error =
    hasAnyData
      ? null
      : Object.entries(next.resourceErrors)
          .filter(([, value]) => value)
          .map(([key, value]) => `${key}: ${value}`)
          .join(' | ') || (allResourcesSettled ? 'No data could be loaded.' : null);

  let loadingStatus: ResourceStatus = 'idle';
  if (hasPendingResource && !hasAnyData) {
    loadingStatus = 'loading';
  } else if (hasAnyData) {
    loadingStatus = 'success';
  } else if (allResourcesSettled) {
    loadingStatus = 'error';
  }

  return {
    ...next,
    loadingStatus,
    error,
    memoryUsage,
    dataSize,
  };
}

const DataCacheContext = createContext<DataCacheContextValue | undefined>(undefined);

function normalizeLithology(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function fallbackColor(value: string) {
  const hash = hashString(value);
  const hue = hash % 360;
  const saturation = 55 + (hash % 20);
  const lightness = 40 + (hash % 20);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function getModelCenter(points: Array<{ lon: number; lat: number }>) {
  if (points.length === 0) {
    return DEFAULT_MODEL_CENTER;
  }

  const centerLon = points.reduce((sum, point) => sum + point.lon, 0) / points.length;
  const centerLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;

  return { lon: centerLon, lat: centerLat };
}

function projectPointToLocalMeters(point: { lon: number; lat: number; elevation: number }, center: { lon: number; lat: number }) {
  const earthRadiusMeters = 6371e3;
  const dLon = (point.lon - center.lon) * (Math.PI / 180);
  const dLat = (point.lat - center.lat) * (Math.PI / 180);

  return {
    x: earthRadiusMeters * dLon * Math.cos(center.lat * Math.PI / 180),
    y: Number.isFinite(point.elevation) ? point.elevation : 0,
    z: earthRadiusMeters * dLat,
  };
}

function normalizeVector(vector: { x: number; y: number; z: number }) {
  const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
  if (!Number.isFinite(length) || length < 0.001) {
    return null;
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
    length,
  };
}

function quaternionFromZAxis(direction: { x: number; y: number; z: number }) {
  const from = { x: 0, y: 0, z: 1 };
  const dot = from.x * direction.x + from.y * direction.y + from.z * direction.z;

  if (dot < -0.999999) {
    return { x: 1, y: 0, z: 0, w: 0 };
  }

  const cross = {
    x: from.y * direction.z - from.z * direction.y,
    y: from.z * direction.x - from.x * direction.z,
    z: from.x * direction.y - from.y * direction.x,
  };
  const quaternion = {
    x: cross.x,
    y: cross.y,
    z: cross.z,
    w: 1 + dot,
  };
  const length = Math.sqrt(
    quaternion.x * quaternion.x +
      quaternion.y * quaternion.y +
      quaternion.z * quaternion.z +
      quaternion.w * quaternion.w
  );

  if (!Number.isFinite(length) || length < 0.001) {
    return { x: 0, y: 0, z: 0, w: 1 };
  }

  return {
    x: quaternion.x / length,
    y: quaternion.y / length,
    z: quaternion.z / length,
    w: quaternion.w / length,
  };
}

function buildBoreholeIndex(segments: DrillholeSegment[]) {
  const byHoleId: Record<string, BoreholeInfo> = {};
  const points: Array<{ lon: number; lat: number; elevation: number }> = [];

  for (const segment of segments) {
    if (!byHoleId[segment.hole_id]) {
      byHoleId[segment.hole_id] = { segments: [], orientation: null, length: 0 };
    }

    byHoleId[segment.hole_id].segments.push(segment);
    points.push({ lon: segment.lon, lat: segment.lat, elevation: segment.elevation });
  }

  const modelCenter = getModelCenter(points);

  for (const borehole of Object.values(byHoleId)) {
    if (borehole.segments.length === 0) continue;

    const firstSegment = borehole.segments[0];
    const lastSegment = borehole.segments[borehole.segments.length - 1];
    const p0 = projectPointToLocalMeters(firstSegment, modelCenter);
    const p1 = projectPointToLocalMeters(lastSegment, modelCenter);
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dz = p1.z - p0.z;
    const direction = normalizeVector({ x: dx, y: dy, z: dz });
    const length = direction?.length ?? 0.01;

    borehole.orientation = {
      midpoint: {
        x: (p0.x + p1.x) / 2,
        y: (p0.y + p1.y) / 2,
        z: (p0.z + p1.z) / 2,
      },
      quaternion: direction ? quaternionFromZAxis(direction) : { x: 0, y: 0, z: 0, w: 1 },
      length,
    };
    borehole.length = length;
  }

  return {
    byHoleId,
    modelCenter,
  };
}

function parseDrillholeFeatures(geoJson: any): DrillholeSegment[] {
  return (geoJson?.features ?? []).flatMap((feature: any) => {
    const properties = feature?.properties ?? {};
    const coordinates = feature?.geometry?.coordinates;

    if (feature?.geometry?.type !== 'LineString' || !Array.isArray(coordinates) || coordinates.length < 2) {
      return [];
    }

    const [startCoords] = coordinates;
    if (!Array.isArray(startCoords) || startCoords.length < 3) {
      return [];
    }

    return [
      {
        lon: Number(startCoords[0]),
        lat: Number(startCoords[1]),
        elevation: Number(startCoords[2]),
        depth_from: Number(properties.depth_from ?? 0),
        depth_to: Number(properties.depth_to ?? 0),
        hole_id: String(properties.hole_id ?? ''),
        lithology: properties.lithology,
        graphitic_carbon: properties.graphitic_carbon,
        feature,
      },
    ];
  });
}

function parseBlockModelFeatures(geoJson: any): BlockSegment[] {
  return (geoJson?.features ?? []).flatMap((feature: any) => {
    const coordinates = feature?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 3) {
      return [];
    }

    const properties = feature?.properties ?? {};

    return [
      {
        lon: Number(coordinates[0]),
        lat: Number(coordinates[1]),
        elevation: Number(coordinates[2]),
        Id: String(properties.Id ?? ''),
        dX: Number(properties.dX ?? 10),
        dY: Number(properties.dY ?? 10),
        dZ: Number(properties.dZ ?? 10),
        'Kr, GRAPHITIC_CARBON in GM_Litho: GRSC': properties['Kr, GRAPHITIC_CARBON in GM_Litho: GRSC'],
        RescCalc: properties.RescCalc,
        feature,
      },
    ];
  });
}

function processLithologyData(segments: DrillholeSegment[]): ProcessedLithologyData {
  const { byHoleId, modelCenter } = buildBoreholeIndex(segments);
  const lithologySet = new Set<string>();

  for (const segment of segments) {
    lithologySet.add(String(segment.lithology ?? 'UNKNOWN'));
  }

  const legendMap: Record<string, string> = {};
  const legendItems: Array<{ label: string; color: string }> = [];
  const grouped: Record<string, DrillholeSegment[]> = {};

  for (const lithology of Array.from(lithologySet).sort((left, right) => left.localeCompare(right))) {
    const normalized = normalizeLithology(lithology);
    const baseColor = LITHOLOGY_COLOR_MAP[lithology];
    const isUnknown = normalized === 'unknown' || normalized === 'nan';
    const color = baseColor ?? (isUnknown ? (LITHOLOGY_COLOR_MAP.UNKNOWN ?? fallbackColor(lithology)) : fallbackColor(lithology));

    legendMap[normalized] = color;
    legendItems.push({ label: lithology, color });
  }

  for (const borehole of Object.values(byHoleId)) {
    for (const segment of borehole.segments) {
      const lithology = String(segment.lithology ?? 'UNKNOWN');
      const normalized = normalizeLithology(lithology);
      const color = legendMap[normalized] ?? fallbackColor(lithology);

      if (!grouped[color]) {
        grouped[color] = [];
      }

      grouped[color].push(segment);
    }
  }

  return {
    byHoleId,
    modelCenter,
    grouped,
    legendItems,
    legendMap,
  };
}

function processAssayData(segments: DrillholeSegment[]): ProcessedAssayData {
  const { byHoleId, modelCenter } = buildBoreholeIndex(segments);
  const assayValues = segments
    .map((segment) => Number(segment.graphitic_carbon))
    .filter((value) => Number.isFinite(value));

  const assayRange =
    assayValues.length === 0
      ? { min: 0, max: 1 }
      : { min: Math.min(...assayValues), max: Math.max(...assayValues) };

  const grouped: Record<string, Array<DrillholeSegment & { colorT: number }>> = {};

  for (const borehole of Object.values(byHoleId)) {
    for (const segment of borehole.segments) {
      const value = Number(segment.graphitic_carbon ?? 0);
      const colorT =
        assayRange.max > assayRange.min
          ? (value - assayRange.min) / (assayRange.max - assayRange.min)
          : 0.5;
      const key = `assay_${colorT.toFixed(2)}`;

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push({ ...segment, colorT });
    }
  }

  return {
    byHoleId,
    modelCenter,
    assayRange,
    grouped,
  };
}

async function fetchJson({
  label,
  candidates,
  attempts = GEOJSON_FETCH_ATTEMPTS,
  timeoutMs = GEOJSON_FETCH_TIMEOUT_MS,
  validate,
}: FetchJsonOptions) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    for (const candidate of Array.from(new Set(candidates.filter(Boolean)))) {
      const controller = typeof AbortController === 'undefined' ? null : new AbortController();
      const timeoutId = controller
        ? setTimeout(() => controller.abort(`Timed out while fetching ${label}.`), timeoutMs)
        : null;

      try {
        const response = await fetch(candidate, {
          cache: candidate.startsWith('/api/') ? 'no-store' : 'force-cache',
          signal: controller?.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch ${label} from ${candidate}: ${response.status} ${response.statusText}`);
        }

        const payload = await response.json();
        if (validate && !validate(payload)) {
          throw new Error(`Invalid ${label} payload from ${candidate}.`);
        }

        return payload;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      } finally {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
      }
    }

    if (attempt < attempts - 1) {
      await delay(500 * (attempt + 1));
    }
  }

  throw lastError ?? new Error(`Failed to fetch ${label}.`);
}

export const DataCacheProvider = ({ children }: { children: ReactNode }) => {
  const [cache, setCache] = useState<DataCache>(initialState);
  const [loadRevision, setLoadRevision] = useState(0);
  const autoRetryCountRef = useRef(0);
  const blockModelLoadRef = useRef<Promise<void> | null>(null);

  const refetch = useCallback(() => {
    setCache((current) =>
      deriveCacheState({
        ...current,
        error: null,
        resourceStatus: initialResourceStatus,
        resourceErrors: initialResourceErrors,
      })
    );
    setLoadRevision((current) => current + 1);
  }, []);

  const loadBlockModel = useCallback(() => {
    if (blockModelLoadRef.current) return;

    let shouldLoad = false;
    setCache((current) => {
      if (current.blockModelData?.length || current.resourceStatus.blockModel === 'loading') {
        return current;
      }

      shouldLoad = true;
      return deriveCacheState({
        ...current,
        resourceStatus: {
          ...current.resourceStatus,
          blockModel: 'loading',
        },
        resourceErrors: {
          ...current.resourceErrors,
          blockModel: null,
        },
      });
    });

    if (!shouldLoad) return;

    blockModelLoadRef.current = fetchJson({
      label: 'block model data',
      candidates: resourceCandidates.blockModel,
      validate: isGeoJsonFeatureCollection,
    })
      .then((payload) => {
        const blockSegments = parseBlockModelFeatures(payload);
        if (blockSegments.length === 0) {
          throw new Error('Block model payload loaded but no blocks were parsed.');
        }

        setCache((current) =>
          deriveCacheState({
            ...current,
            blockModelData: blockSegments,
            resourceStatus: {
              ...current.resourceStatus,
              blockModel: 'success',
            },
            resourceErrors: {
              ...current.resourceErrors,
              blockModel: null,
            },
          })
        );
      })
      .catch((error) => {
        setCache((current) =>
          deriveCacheState({
            ...current,
            resourceStatus: {
              ...current.resourceStatus,
              blockModel: 'error',
            },
            resourceErrors: {
              ...current.resourceErrors,
              blockModel: error instanceof Error ? error.message : String(error),
            },
          })
        );
      })
      .finally(() => {
        blockModelLoadRef.current = null;
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let idleHandle: number | null = null;
    let timerHandle: number | null = null;

    const loadData = async () => {
      setCache((current) =>
        deriveCacheState({
          ...current,
          resourceStatus: {
            lithology: 'loading',
            assay: 'loading',
            blockModel: 'idle',
          },
          resourceErrors: initialResourceErrors,
        })
      );

      const getCurrentDrillholeData = (drillholeData: DataCache['drillholeData']): DrillholeDataState => ({
        lithology: drillholeData?.lithology ?? [],
        assay: drillholeData?.assay ?? [],
      });

      const commitUpdate = (updater: (current: DataCache) => DataCache) => {
        if (cancelled) return;
        setCache((current) => deriveCacheState(updater(current)));
      };

      void fetchJson({
        label: 'lithology data',
        candidates: resourceCandidates.lithology,
        validate: isGeoJsonFeatureCollection,
      })
        .then((payload) => {
          const lithologySegments = parseDrillholeFeatures(payload);
          if (lithologySegments.length === 0) {
            throw new Error('Lithology payload loaded but no drillhole segments were parsed.');
          }
          const processedLithologyData =
            lithologySegments.length > 0 ? processLithologyData(lithologySegments) : null;

          commitUpdate((current) => {
            const drillholeData = getCurrentDrillholeData(current.drillholeData);
            return {
              ...current,
              drillholeData: {
                ...drillholeData,
                lithology: lithologySegments,
              },
              processedLithologyData,
              resourceStatus: {
                ...current.resourceStatus,
                lithology: 'success',
              },
              resourceErrors: {
                ...current.resourceErrors,
                lithology: null,
              },
            };
          });
        })
        .catch((error) => {
          commitUpdate((current) => ({
            ...current,
            resourceStatus: {
              ...current.resourceStatus,
              lithology: 'error',
            },
            resourceErrors: {
              ...current.resourceErrors,
              lithology: error instanceof Error ? error.message : String(error),
            },
          }));
        });

      void fetchJson({
        label: 'assay data',
        candidates: resourceCandidates.assay,
        validate: isGeoJsonFeatureCollection,
      })
        .then((payload) => {
          const assaySegments = parseDrillholeFeatures(payload);
          if (assaySegments.length === 0) {
            throw new Error('Assay payload loaded but no drillhole segments were parsed.');
          }
          const processedAssayData = assaySegments.length > 0 ? processAssayData(assaySegments) : null;

          commitUpdate((current) => {
            const drillholeData = getCurrentDrillholeData(current.drillholeData);
            return {
              ...current,
              drillholeData: {
                ...drillholeData,
                assay: assaySegments,
              },
              processedAssayData,
              resourceStatus: {
                ...current.resourceStatus,
                assay: 'success',
              },
              resourceErrors: {
                ...current.resourceErrors,
                assay: null,
              },
            };
          });
        })
        .catch((error) => {
          commitUpdate((current) => ({
            ...current,
            resourceStatus: {
              ...current.resourceStatus,
              assay: 'error',
            },
            resourceErrors: {
              ...current.resourceErrors,
              assay: error instanceof Error ? error.message : String(error),
            },
          }));
        });
    };

    const startLoading = () => {
      if (!cancelled) {
        void loadData();
      }
    };

    const browserWindow =
      typeof window === 'undefined'
        ? null
        : (window as Window & typeof globalThis & {
            requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
            cancelIdleCallback?: (handle: number) => void;
          });

    if (browserWindow?.requestIdleCallback) {
      idleHandle = browserWindow.requestIdleCallback(startLoading, { timeout: 2200 });
    } else if (browserWindow) {
      timerHandle = browserWindow.setTimeout(startLoading, 900);
    } else {
      void loadData();
    }

    return () => {
      cancelled = true;
      if (idleHandle !== null && browserWindow?.cancelIdleCallback) {
        browserWindow.cancelIdleCallback(idleHandle);
      }
      if (timerHandle !== null) {
        clearTimeout(timerHandle);
      }
    };
  }, [loadRevision]);

  useEffect(() => {
    const failedResources = (Object.keys(cache.resourceStatus) as CacheResourceKey[]).filter(
      (resource) => cache.resourceStatus[resource] === 'error' && !hasResourceData(cache, resource)
    );

    if (failedResources.length === 0) {
      autoRetryCountRef.current = 0;
      return;
    }

    if (autoRetryCountRef.current >= 2) {
      return;
    }

    const retryAttempt = autoRetryCountRef.current + 1;
    const retryDelayMs = retryAttempt * 2500;
    const timer = setTimeout(() => {
      autoRetryCountRef.current = retryAttempt;
      refetch();
    }, retryDelayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [
    cache.resourceStatus.lithology,
    cache.resourceStatus.assay,
    cache.resourceStatus.blockModel,
    cache.drillholeData?.lithology?.length,
    cache.drillholeData?.assay?.length,
    cache.blockModelData?.length,
    refetch,
  ]);

  const value = useMemo(() => ({ ...cache, refetch, loadBlockModel }), [cache, loadBlockModel, refetch]);

  return <DataCacheContext.Provider value={value}>{children}</DataCacheContext.Provider>;
};

export const useDataCache = () => {
  const context = useContext(DataCacheContext);
  if (context === undefined) {
    throw new Error('useDataCache must be used within a DataCacheProvider');
  }
  return context;
};
