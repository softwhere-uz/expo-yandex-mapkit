import { requireNativeView } from 'expo';
import * as React from 'react';
import { Image, processColor } from 'react-native';

import {
  CameraMoveOptions,
  CameraPosition,
  FitOptions,
  GeoObjectSelection,
  Point,
  ScreenPoint,
  YandexMapViewProps,
  YandexMapViewRef,
} from './ExpoYandexMapKit.types';

// The native side takes the user-location icon as a plain URI string and colors as processColor()'d
// values (the marker/shape convention), so those props are transformed before reaching the native
// view; everything else passes through unchanged.
type NativeMapViewProps = Omit<
  YandexMapViewProps,
  'userLocationIcon' | 'userLocationAccuracyFillColor' | 'userLocationAccuracyStrokeColor'
> & {
  userLocationIcon?: string;
  userLocationAccuracyFillColor?: ReturnType<typeof processColor>;
  userLocationAccuracyStrokeColor?: ReturnType<typeof processColor>;
  ref?: React.Ref<unknown>;
};

// The native component. Expo attaches the view's AsyncFunctions to whatever ref is
// passed to it, so `nativeRef.current.getCameraPosition()` etc. resolve at runtime.
const NativeView: React.ComponentType<NativeMapViewProps> = requireNativeView('ExpoYandexMapKit');

export const YandexMapView = React.forwardRef<YandexMapViewRef, YandexMapViewProps>(
  (
    { userLocationIcon, userLocationAccuracyFillColor, userLocationAccuracyStrokeColor, ...props },
    ref
  ) => {
    const nativeRef = React.useRef<any>(null);

    // Resolve the user-location icon (require(...) number or { uri }) to the URI the native side
    // loads; undefined keeps MapKit's default location dot.
    const userLocationIconUri = React.useMemo(
      () =>
        userLocationIcon == null
          ? undefined
          : (Image.resolveAssetSource(userLocationIcon)?.uri ?? undefined),
      [userLocationIcon]
    );

    React.useImperativeHandle(
      ref,
      // Guard nativeRef.current: after unmount (or before the first commit) it is null.
      // Optional chaining + a resolved fallback keeps every method returning a Promise
      // instead of throwing a synchronous TypeError at the call site.
      () => ({
        setCenter: (position: CameraPosition, options?: CameraMoveOptions) =>
          nativeRef.current?.setCenter(position, options ?? {}) ?? Promise.resolve(),
        setZoom: (zoom: number, options?: CameraMoveOptions) =>
          nativeRef.current?.setZoom(zoom, options ?? {}) ?? Promise.resolve(),
        fitMarkers: (points: Point[], options?: FitOptions) =>
          nativeRef.current?.fitMarkers(points, options ?? {}) ?? Promise.resolve(),
        fitAllMarkers: (options?: FitOptions) =>
          nativeRef.current?.fitAllMarkers(options ?? {}) ?? Promise.resolve(),
        getCameraPosition: () => nativeRef.current?.getCameraPosition() ?? Promise.resolve(null),
        getVisibleRegion: () => nativeRef.current?.getVisibleRegion() ?? Promise.resolve(null),
        getScreenPoints: (points: Point[]) =>
          nativeRef.current?.getScreenPoints(points) ?? Promise.resolve([]),
        getWorldPoints: (points: ScreenPoint[]) =>
          nativeRef.current?.getWorldPoints(points) ?? Promise.resolve([]),
        selectGeoObject: (selection: GeoObjectSelection) =>
          nativeRef.current?.selectGeoObject(selection) ?? Promise.resolve(),
        deselectGeoObject: () => nativeRef.current?.deselectGeoObject() ?? Promise.resolve(),
      }),
      []
    );

    return (
      <NativeView
        {...props}
        userLocationIcon={userLocationIconUri}
        userLocationAccuracyFillColor={processColor(userLocationAccuracyFillColor)}
        userLocationAccuracyStrokeColor={processColor(userLocationAccuracyStrokeColor)}
        ref={nativeRef}
      />
    );
  }
);

YandexMapView.displayName = 'YandexMapView';
