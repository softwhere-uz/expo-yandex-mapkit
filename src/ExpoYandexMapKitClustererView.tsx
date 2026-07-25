import { requireNativeView } from 'expo';
import * as React from 'react';
import { processColor } from 'react-native';

import { ClustererProps } from './ExpoYandexMapKit.types';

// Native clusterer view. It is a named module view (`ExpoYandexMapKitClustererView`), like the
// shape/marker children, so it is required by name; the map view stays the module's default view.
// It groups its `<Marker>` children into a MapKit ClusterizedPlacemarkCollection. Colors are sent
// through processColor (the marker/shape convention). `onClusterPress` is not one of RN's reserved
// bubbling event names (only `onPress`/`topPress` is), so — unlike the marker's `onPress` →
// `onMarkerPress` rename — it is forwarded to the native event of the same name directly.
type NativeClustererProps = Omit<ClustererProps, 'clusterColor' | 'clusterTextColor'> & {
  clusterColor?: ReturnType<typeof processColor>;
  clusterTextColor?: ReturnType<typeof processColor>;
};

const NativeClustererView: React.ComponentType<NativeClustererProps> = requireNativeView(
  'ExpoYandexMapKit',
  'ExpoYandexMapKitClustererView'
);

/**
 * Groups its `<Marker>` children into clusters. Place it as a child of the map, and put the markers
 * to cluster inside it:
 *
 * ```tsx
 * <YandexMapView cameraPosition={...}>
 *   <Clusterer clusterRadius={60} minZoom={12} onClusterPress={onCluster}>
 *     {data.map((d) => (
 *       <Marker key={d.id} point={d.point} identifier={d.id} onPress={onMarker} />
 *     ))}
 *   </Clusterer>
 * </YandexMapView>
 * ```
 *
 * Markers keep all their usual features (image / React-children icons, `onPress`, `identifier`).
 * Tapping a cluster fits the camera to its markers by default (`fitClusterOnPress`) and reports
 * `onClusterPress`. Only `<Marker>` children are clustered — shapes belong directly under the map.
 */
export function Clusterer({ clusterColor, clusterTextColor, ...props }: ClustererProps) {
  return (
    <NativeClustererView
      {...props}
      clusterColor={processColor(clusterColor)}
      clusterTextColor={processColor(clusterTextColor)}
    />
  );
}
