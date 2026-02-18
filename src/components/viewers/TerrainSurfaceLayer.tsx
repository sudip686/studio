'use client';

import { TerrainAscLayer } from './TerrainAscLayer';

// This is now a wrapper around the high-quality TerrainAscLayer to ensure consistency across the app.
export default function TerrainSurfaceLayer(props: any) {
    return <TerrainAscLayer {...props} />;
}