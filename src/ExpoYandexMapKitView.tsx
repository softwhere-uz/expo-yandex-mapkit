import { requireNativeView } from 'expo';
import * as React from 'react';

import {
  CameraMoveOptions,
  CameraPosition,
  FitOptions,
  Point,
  ScreenPoint,
  YandexMapViewProps,
  YandexMapViewRef,
} from './ExpoYandexMapKit.types';

// The native component. Expo attaches the view's AsyncFunctions to whatever ref is
// passed to it, so `nativeRef.current.getCameraPosition()` etc. resolve at runtime.
const NativeView: React.ComponentType<YandexMapViewProps & { ref?: React.Ref<unknown> }> =
  requireNativeView('ExpoYandexMapKit');

export const YandexMapView = React.forwardRef<YandexMapViewRef, YandexMapViewProps>(
  (props, ref) => {
    const nativeRef = React.useRef<any>(null);

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
      }),
      []
    );

    return <NativeView {...props} ref={nativeRef} />;
  }
);

YandexMapView.displayName = 'YandexMapView';
