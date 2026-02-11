// src/lib/boreholes/geometry-cache.ts

let lithologyCache: any[] = [];
let isCacheReady = false;

/**
 * Checks if the geometry cache for lithology data is populated.
 * @returns {boolean} True if the cache is ready, false otherwise.
 */
export function hasCachedLithology(): boolean {
    return isCacheReady;
}

/**
 * Retrieves the cached lithology geometry instances.
 * @returns {any[]} An array of Cesium.GeometryInstance objects.
 */
export function getLithologyCache(): any[] {
    if (!isCacheReady) {
        console.warn("Attempted to get lithology cache before it was ready.");
    }
    return lithologyCache;
}

/**
 * Stores the calculated lithology geometry instances in the cache.
 * @param {any[]} instances An array of Cesium.GeometryInstance objects to cache.
 */
export function setLithologyCache(instances: any[]) {
    console.log(`[GeometryCache] Caching ${instances.length} lithology instances.`);
    lithologyCache = instances;
    isCacheReady = instances.length > 0;
}
