import { requireNativeView } from 'expo';
import * as React from 'react';
import { Image, processColor, StyleSheet, View } from 'react-native';

import { ClustererProps } from './ExpoYandexMapKit.types';

// Native clusterer view. It is a named module view (`ExpoYandexMapKitClustererView`), like the
// shape/marker children, so it is required by name; the map view stays the module's default view.
// It groups its `<Marker>` children into a MapKit ClusterizedPlacemarkCollection. Colors are sent
// through processColor and `clusterIcon` is resolved to a URI string (the marker/shape convention).
// `onClusterPress` is not one of RN's reserved bubbling event names (only `onPress`/`topPress` is),
// so — unlike the marker's `onPress` → `onMarkerPress` rename — it is forwarded to the native event
// of the same name directly.
type NativeClustererProps = Omit<
  ClustererProps,
  'clusterColor' | 'clusterTextColor' | 'clusterIcon' | 'renderCluster'
> & {
  clusterColor?: ReturnType<typeof processColor>;
  clusterTextColor?: ReturnType<typeof processColor>;
  clusterIcon?: string;
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
 *
 * For a fully custom badge, pass `renderCluster={() => <YourBadge />}`: the element is snapshotted
 * to an image used for every cluster, with the count drawn on top.
 */
export function Clusterer({
  clusterColor,
  clusterTextColor,
  clusterIcon,
  renderCluster,
  children,
  ...props
}: ClustererProps) {
  // Resolve the badge icon (require(...) number or { uri }) to the URI the native side loads;
  // undefined leaves the default drawn color disc.
  const clusterIconUri = React.useMemo(
    () =>
      clusterIcon == null ? undefined : (Image.resolveAssetSource(clusterIcon)?.uri ?? undefined),
    [clusterIcon]
  );

  return (
    <NativeClustererView
      {...props}
      clusterColor={processColor(clusterColor)}
      clusterTextColor={processColor(clusterTextColor)}
      clusterIcon={clusterIconUri}
    >
      {/* The badge template: a single off-screen host the native side snapshots. It must be the
          only non-<Marker> child, and collapsable={false} keeps Android from view-flattening it so
          it retains a real view to snapshot. It renders nothing on-screen (the clusterer is not in
          the map's view hierarchy). */}
      {renderCluster ? (
        <View collapsable={false} style={styles.badgeTemplate}>
          {renderCluster()}
        </View>
      ) : null}
      {children}
    </NativeClustererView>
  );
}

const styles = StyleSheet.create({
  // Absolute so the template shrink-wraps its content and does not affect any layout.
  badgeTemplate: { position: 'absolute' },
});
