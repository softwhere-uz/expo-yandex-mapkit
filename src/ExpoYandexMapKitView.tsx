import { requireNativeView } from 'expo';
import * as React from 'react';
import { Image, processColor } from 'react-native';

import {
  CameraMoveOptions,
  CameraPosition,
  CameraPositionChangeEvent,
  EdgePadding,
  FitOptions,
  GeoObjectSelection,
  Point,
  Region,
  ScreenPoint,
  VisibleRegion,
  YandexMapViewProps,
  YandexMapViewRef,
} from './ExpoYandexMapKit.types';

// Turn the visible region quad + the camera center into a react-native-maps `Region`.
function toRegion(center: CameraPosition, region: VisibleRegion): Region {
  return {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta: Math.abs(region.topLeft.latitude - region.bottomLeft.latitude),
    longitudeDelta: Math.abs(region.topRight.longitude - region.topLeft.longitude),
  };
}

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
    {
      userLocationIcon,
      userLocationAccuracyFillColor,
      userLocationAccuracyStrokeColor,
      onCameraPositionChanged,
      onRegionChangeComplete,
      ...props
    },
    ref
  ) => {
    const nativeRef = React.useRef<any>(null);

    // Forward the native camera event to the user's handler, and — for the react-native-maps
    // `onRegionChangeComplete` alias — once a move settles, read the visible region and hand back a
    // `Region`. Recreated each render so it always sees the latest props.
    const handleCameraPositionChanged = (event: { nativeEvent: CameraPositionChangeEvent }) => {
      onCameraPositionChanged?.(event);
      if (event.nativeEvent.finished && onRegionChangeComplete) {
        nativeRef.current?.getVisibleRegion().then((region: VisibleRegion | null) => {
          if (region) {
            onRegionChangeComplete(toRegion(event.nativeEvent.cameraPosition, region));
          }
        });
      }
    };

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
        takeSnapshot: () => nativeRef.current?.takeSnapshot() ?? Promise.resolve(null),
        selectGeoObject: (selection: GeoObjectSelection) =>
          nativeRef.current?.selectGeoObject(selection) ?? Promise.resolve(),
        deselectGeoObject: () => nativeRef.current?.deselectGeoObject() ?? Promise.resolve(),
        fitToCoordinates: (
          coordinates: Point[],
          options?: { edgePadding?: EdgePadding; animated?: boolean }
        ) =>
          nativeRef.current?.fitMarkers(coordinates, {
            edgePadding: options?.edgePadding,
            durationSeconds: options?.animated === false ? 0 : undefined,
          }) ?? Promise.resolve(),
      }),
      []
    );

    return (
      <NativeView
        {...props}
        onCameraPositionChanged={
          onCameraPositionChanged || onRegionChangeComplete
            ? handleCameraPositionChanged
            : undefined
        }
        userLocationIcon={userLocationIconUri}
        userLocationAccuracyFillColor={processColor(userLocationAccuracyFillColor)}
        userLocationAccuracyStrokeColor={processColor(userLocationAccuracyStrokeColor)}
        ref={nativeRef}
      />
    );
  }
);

YandexMapView.displayName = 'YandexMapView';
