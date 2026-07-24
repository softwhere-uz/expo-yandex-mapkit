import { requireNativeView } from 'expo';
import * as React from 'react';
import { Image } from 'react-native';

import { MarkerProps, MarkerRef, Point } from './ExpoYandexMapKit.types';

// Native marker view. It is the module's second view (`Name("ExpoYandexMapKitMarkerView")`),
// so it is required by name; the map view stays the module's default view. `source` is resolved
// to a plain URI string here — the native side only deals in URIs. `zIndex` is sent as `zI` so
// React Native's own layout `zIndex` doesn't intercept it (the marker owns no laid-out view).
type NativeMarkerProps = Omit<MarkerProps, 'source' | 'zIndex'> & {
  source?: string;
  zI?: number;
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
  ({ source, zIndex, ...props }, ref) => {
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

    return <NativeMarkerView {...props} source={uri} zI={zIndex} ref={nativeRef} />;
  }
);

Marker.displayName = 'YandexMarker';
