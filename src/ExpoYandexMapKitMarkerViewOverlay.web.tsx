import type { MarkerViewProps } from './ExpoYandexMapKit.types';

// There is no native map on web (the map view web stub renders nothing), so a live marker view
// renders nothing too — it has no screen coordinate to anchor to.
export function MarkerView(_props: MarkerViewProps) {
  return null;
}

MarkerView.displayName = 'YandexMarkerView';
