'use client';

import { useMemo } from 'react';
import { TerrainAscLayer } from './TerrainAscLayer';
import ForgeTerrainObjLayer from './ForgeTerrainObjLayer';
import OsmEnvironmentLayer from './OsmEnvironmentLayer';

type TerrainSurfaceLayerProps = {
    verticalScale?: number;
    modelCenter?: { lon: number; lat: number };
    clipRadiusM?: number | null;
    quality?: 'interactive' | 'presentation';
    onLoaded?: (info?: unknown) => void;
    meshVisible?: boolean;
    meshOpacity?: number;
    showEnvironment?: boolean;
    sceneMode?: 'auto' | 'clean';
};

const USE_FORGE3D_TEST_TERRAIN = true;

export default function TerrainSurfaceLayer(props: TerrainSurfaceLayerProps) {
    const isPresentationSlide = useMemo(() => {
        if (typeof window === 'undefined') return false;
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        return ['lithology', 'assay', 'carbon_model', 'classification'].some((id) =>
            pathSegments.includes(id)
        );
    }, []);

    const showEnvironment = props.showEnvironment ?? true;
    const useCleanScene = props.sceneMode === 'clean';
    const useForgeTerrain = USE_FORGE3D_TEST_TERRAIN && !useCleanScene;
    const backendLabel = useForgeTerrain ? 'FORGE_OBJ' : 'ASC_LEGACY';
    const forgeUrl = useMemo(() => `/generated/forge3d_test_terrain_simplified.obj?v=2026-05-20-1`, []);

    if (typeof window !== 'undefined') {
      (window as any).__terrainBackend = backendLabel;
    }

    return (
      <>
        {useForgeTerrain ? (
          <ForgeTerrainObjLayer
            objUrl={forgeUrl}
            modelCenter={props.modelCenter}
            verticalScale={props.verticalScale ?? 1}
            meshVisible={props.meshVisible ?? true}
            meshOpacity={props.meshOpacity ?? 1}
            visualMode={isPresentationSlide ? 'technical' : 'default'}
            onLoaded={props.onLoaded}
          />
        ) : (
          <TerrainAscLayer
            verticalScale={props.verticalScale}
            modelCenter={props.modelCenter}
            clipRadiusM={useCleanScene ? null : props.clipRadiusM}
            quality={props.quality}
            onLoaded={props.onLoaded as any}
            meshVisible={props.meshVisible}
            meshOpacity={props.meshOpacity}
          />
        )}
        {showEnvironment ? (
          <OsmEnvironmentLayer modelCenter={props.modelCenter} meshVisible={props.meshVisible ?? true} />
        ) : null}
      </>
    );
}