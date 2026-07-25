import { PolygonProps } from './ExpoYandexMapKit.types';

// No native map on web — a polygon renders nothing.
export function Polygon(_props: PolygonProps) {
  return null;
}
