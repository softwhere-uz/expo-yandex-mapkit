import { requireNativeView } from 'expo';
import * as React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { MarkerProps, MarkerRef, Point } from './ExpoYandexMapKit.types';

// Native marker view. It is the module's second view (`Name("ExpoYandexMapKitMarkerView")`),
// so it is required by name; the map view stays the module's default view. `source` is resolved
// to a plain URI string here — the native side only deals in URIs. `zIndex` is sent as `zI` so
// React Native's own layout `zIndex` doesn't intercept it (the marker owns no laid-out view).
// The public `onPress` prop is forwarded to the native `onMarkerPress` event: React Native reserves
// `onPress`/`topPress` as a bubbling event, which collides with Expo's direct view events and
// red-screens on mount ("Event cannot be both direct and bubbling: topPress").
type NativeMarkerProps = Omit<MarkerProps, 'source' | 'zIndex' | 'onPress'> & {
  source?: string;
  zI?: number;
  onMarkerPress?: MarkerProps['onPress'];
  ref?: React.Ref<unknown>;
};

const NativeMarkerView: React.ComponentType<NativeMarkerProps> = requireNativeView(
  'ExpoYandexMapKit',
  'ExpoYandexMapKitMarkerView'
);

/**
 * A marker (placemark) rendered on a `YandexMapView`. Place it as a child of the map:
 *
 * ```tsx
 * <YandexMapView cameraPosition={...}>
 *   <Marker point={{ latitude, longitude }} source={require('./pin.png')} />
 * </YandexMapView>
 * ```
 */
export const Marker = React.forwardRef<MarkerRef, MarkerProps>(
  ({ source, zIndex, onPress, children, ...props }, ref) => {
    const nativeRef = React.useRef<any>(null);

    // Turn an ImageSourcePropType (require(...) number or { uri }) into the URI the native side
    // loads. `undefined` leaves the marker on MapKit's default pin.
    const uri = React.useMemo(
      () => (source == null ? undefined : (Image.resolveAssetSource(source)?.uri ?? undefined)),
      [source]
    );

    React.useImperativeHandle(
      ref,
      // Guard nativeRef.current: null before the first commit / after unmount. Optional chaining
      // plus a resolved fallback keeps each method returning a Promise instead of throwing.
      () => ({
        animatedMoveTo: (point: Point, durationMs: number) =>
          nativeRef.current?.animatedMoveTo(point, durationMs) ?? Promise.resolve(),
        animatedRotateTo: (angle: number, durationMs: number) =>
          nativeRef.current?.animatedRotateTo(angle, durationMs) ?? Promise.resolve(),
      }),
      []
    );

    return (
      <NativeMarkerView {...props} source={uri} zI={zIndex} onMarkerPress={onPress} ref={nativeRef}>
        {children != null ? <View style={styles.childWrap}>{children}</View> : null}
      </NativeMarkerView>
    );
  }
);

Marker.displayName = 'YandexMarker';

const styles = StyleSheet.create({
  // Wrap the marker's React children so they size to their own content. The native marker view is
  // laid out at the map's full width, and a child with the default `alignItems: stretch` would
  // otherwise fill it — snapshotting a small pin/bubble as a full-width icon. `flex-start` makes the
  // wrapper hug its content instead.
  childWrap: { alignSelf: 'flex-start' },
});
