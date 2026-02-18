'use client';

import { useEffect, useRef } from 'react';
import { useCesium } from '@/contexts/cesium-context';

interface Props {
  /** Keep the inside of the KMZ polygon and clip everything outside (default = true). */
  keepInside?: boolean;
  /** Show white cut edges like Sandcastle (default = true). */
  edgeStyling?: boolean;
  /** Path to your KMZ (default = '/tanga_boundary.kmz'). */
  kmzUrl?: string;
}

const KMZPolygonClippingPlanes = ({
  keepInside = true,
  edgeStyling = true,
  kmzUrl = '/tanga_boundary.kmz',
}: Props) => {
  const { viewer, ready } = useCesium();
  const kmzRef = useRef<any>(null);

  useEffect(() => {
    if (!ready || !viewer) return;
    const Cesium = (window as any).Cesium as typeof import('cesium');
    if (!Cesium) return;

    let mounted = true;

    const setup = async () => {
      try {
        // 1) Load KMZ
        const kmz = await Cesium.KmlDataSource.load(kmzUrl, {
          clampToGround: true,
        });
        if (!mounted || viewer.isDestroyed()) return;

        await viewer.dataSources.add(kmz);
        viewer.scene.requestRender();
        kmzRef.current = kmz;

        // 2) Find the first polygon ring (outer boundary) in the KMZ
        const time = Cesium.JulianDate.now();
        const polygons: Cesium.Cartesian3[][] = [];

        for (const e of kmz.entities.values) {
          const poly = e.polygon;
          if (!poly || !poly.hierarchy) continue;

          const hierarchy = poly.hierarchy.getValue(time);
          if (!hierarchy) continue;

          // hierarchy can include holes; we’ll use the outer ring
          const collectRings = (h: any) => {
            const ring = (h.positions || h).slice?.() || [];
            if (ring.length >= 3) polygons.push(ring);
            if (h.holes && h.holes.length) {
              for (const hole of h.holes) collectRings(hole);
            }
          };
          collectRings(hierarchy);
        }

        if (!polygons.length) {
          console.warn('KMZ has no polygon rings.');
          return;
        }

        // If multiple polygons exist, we’ll clip to ALL of them (AND)
        const allPlanes: Cesium.ClippingPlane[] = [];

        // 3) For each polygon, compute clipping planes (Sandcastle “St. Helens” method)
        for (const ring of polygons) {
          const pts = ring; // Cesium.Cartesian3[]
          const n = pts.length;

          for (let i = 0; i < n; i++) {
            const curr = pts[i];
            const next = pts[(i + 1) % n];

            // Midpoint of the edge
            const midpoint = Cesium.Cartesian3.multiplyByScalar(
              Cesium.Cartesian3.add(curr, next, new Cesium.Cartesian3()),
              0.5,
              new Cesium.Cartesian3()
            );

            // up: from Earth center through the midpoint
            const up = Cesium.Cartesian3.normalize(
              Cesium.Cartesian3.clone(midpoint),
              new Cesium.Cartesian3()
            );

            // right: along the edge (next - midpoint), normalized
            const right = Cesium.Cartesian3.normalize(
              Cesium.Cartesian3.subtract(next, midpoint, new Cesium.Cartesian3()),
              new Cesium.Cartesian3()
            );

            // normal = cross(right, up) => points outward of the polygon ring on the globe
            let normal = Cesium.Cartesian3.cross(right, up, new Cesium.Cartesian3());
            normal = Cesium.Cartesian3.normalize(normal, normal);

            // Flip normal if we want to *keep inside* the polygon
            // (we want the half-space that faces inward)
            const finalNormal = keepInside
              ? Cesium.Cartesian3.negate(normal, new Cesium.Cartesian3())
              : normal;

            // Distance from plane to origin using midpoint against plane at origin
            const originCentered = new Cesium.Plane(finalNormal, 0.0);
            const distance = Cesium.Plane.getPointDistance(originCentered, midpoint);

            allPlanes.push(new Cesium.ClippingPlane(finalNormal, distance) as any);
          }
        }

        // 4) Apply to terrain
        const globe = viewer.scene.globe;
        const prevBackFace = globe.backFaceCulling;
        const prevSkirts = globe.showSkirts;

        // For polygon “island” cutouts, these defaults look best (like St. Helens):
        globe.backFaceCulling = true;
        globe.showSkirts = true;

        globe.clippingPlanes = new Cesium.ClippingPlaneCollection({
          planes: allPlanes,
          // Intersect the half-spaces => keeps only what all planes agree on (inside)
          unionClippingRegions: false,
          edgeWidth: edgeStyling ? 1.0 : 0.0,
          edgeColor: Cesium.Color.WHITE,
          enabled: true,
        });
        viewer.scene.requestRender();

        // 5) Fly to the KMZ content for a nice view and compute a bounding sphere
        await viewer.flyTo(kmz);
        viewer.scene.requestRender();
        const rectangle = viewer.camera.computeViewRectangle();
        if (rectangle) {
          const bs = Cesium.BoundingSphere.fromRectangle3D(rectangle);
          viewer.camera.viewBoundingSphere(
            bs,
            new Cesium.HeadingPitchRange(0.5, -0.5, bs.radius * 2.5)
          );
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
          viewer.scene.requestRender();
        }

        // Cleanup restores globe flags & clipping
        return () => {
          globe.clippingPlanes?.removeAll();
          globe.clippingPlanes = undefined as any;
          globe.backFaceCulling = prevBackFace;
          globe.showSkirts = prevSkirts;
          viewer.scene.requestRender();
        };

      } catch (err) {
        console.error('KMZPolygonClippingPlanes error:', err);
      }
    };

    let disposer: (() => void) | undefined;
    setup().then((d) => (disposer = d));

    return () => {
      mounted = false;
      if (disposer) disposer();
      if (kmzRef.current && viewer && !viewer.isDestroyed()) {
        viewer.dataSources.remove(kmzRef.current, true);
        kmzRef.current = null;
      }
    };
  }, [ready, viewer, keepInside, edgeStyling, kmzUrl]);

  return null;
};

export default KMZPolygonClippingPlanes;