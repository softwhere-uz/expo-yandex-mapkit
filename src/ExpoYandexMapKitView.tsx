import { requireNativeView } from 'expo';
import * as React from 'react';

import {
  CameraMoveOptions,
  CameraPosition,
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
      () => ({
        setCenter: (position: CameraPosition, options?: CameraMoveOptions) =>
          nativeRef.current.setCenter(position, options ?? {}),
        getCameraPosition: () => nativeRef.current.getCameraPosition(),
        getVisibleRegion: () => nativeRef.current.getVisibleRegion(),
        getScreenPoints: (points: Point[]) => nativeRef.current.getScreenPoints(points),
        getWorldPoints: (points: ScreenPoint[]) => nativeRef.current.getWorldPoints(points),
      }),
      []
    );

    return <NativeView {...props} ref={nativeRef} />;
  }
);

YandexMapView.displayName = 'YandexMapView';
