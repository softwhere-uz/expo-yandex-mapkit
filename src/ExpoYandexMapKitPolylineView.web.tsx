import { PolylineProps } from './ExpoYandexMapKit.types';

// There is no native map on web (the map view web stub warns once and renders nothing), so a
// polyline renders nothing too.
export function Polyline(_props: PolylineProps) {
  return null;
}
