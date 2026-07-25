import { ClustererProps } from './ExpoYandexMapKit.types';

// There is no native map on web (the map view web stub warns once and renders nothing), so a
// clusterer renders nothing too — its `<Marker>` children individually render nothing as well.
export function Clusterer(_props: ClustererProps) {
  return null;
}
