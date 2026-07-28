import { Bounds, Point } from './ExpoYandexMapKit.types';

// Mean Earth radius in metres (IUGG), matching what MapKit's own distance uses closely enough.
const EARTH_RADIUS_M = 6371008.8;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Great-circle (haversine) distance between two coordinates, in **metres**. Pure JS — works on every
 * platform including web, and needs no map instance. Requested in
 * [yamap#227](https://github.com/volga-volga/react-native-yamap/issues/227).
 */
export function distanceBetween(a: Point, b: Point): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Total length of a polyline (the sum of great-circle segment distances), in metres. */
export function pathLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distanceBetween(points[i - 1], points[i]);
  }
  return total;
}

/**
 * The axis-aligned bounding box (`southWest` / `northEast`) that contains every point, or `null` when
 * `points` is empty. Handy for `fitMarkers` or a search window. Does not special-case the antimeridian.
 */
export function boundingBox(points: Point[]): Bounds | null {
  if (points.length === 0) {
    return null;
  }
  let minLat = Infinity;
  let minLon = Infinity;
  let maxLat = -Infinity;
  let maxLon = -Infinity;
  for (const p of points) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLon) minLon = p.longitude;
    if (p.longitude > maxLon) maxLon = p.longitude;
  }
  return {
    southWest: { latitude: minLat, longitude: minLon },
    northEast: { latitude: maxLat, longitude: maxLon },
  };
}
