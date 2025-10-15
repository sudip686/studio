'use client';

import React from 'react';

export function CompassOverlay({ headingDeg = 0 }: { headingDeg: number }) {
  return (
    <div className="pointer-events-none select-none absolute top-4 left-4 w-16 h-16 rounded-full bg-white/85 shadow-md flex items-center justify-center">
      <div
        className="relative w-12 h-12 transition-transform duration-150 ease-out"
        style={{ transform: `rotate(${headingDeg}deg)` }}
        aria-label="Compass"
      >
        {/* Dial */}
        <div className="absolute inset-0 rounded-full border border-gray-400" />
        {/* Cardinal labels */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold text-red-600">N</div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-gray-500">S</div>
        <div className="absolute top-1/2 -translate-y-1/2 -left-3 text-[10px] text-gray-500">W</div>
        <div className="absolute top-1/2 -translate-y-1/2 -right-3 text-[10px] text-gray-500">E</div>
        {/* Needle (N) */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[3px] w-0.5 h-[18px] bg-red-600 rounded-sm origin-top" />
        {/* Needle (S) */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[3px] w-0.5 h-[18px] bg-gray-500 rounded-sm origin-bottom" />
      </div>
    </div>
  );
}

/**
 * Helper to compute camera heading in degrees for your ENU layout.
 * X = East, Z = North (you invert to -Z when placing), so heading = atan2(x, z).
 * If you negate Z during placement, keep the sign here consistent with what "looks right".
 */
export function getCameraHeadingDeg(camera: THREE.Camera, THREE: any): number {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const rad = Math.atan2(dir.x, dir.z);   // matches your previous Math.atan2(x, z)
  return (-rad * 180) / Math.PI;          // negative to keep "N" up as you did before
}
