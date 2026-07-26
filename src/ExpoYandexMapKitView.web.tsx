import * as React from 'react';

import { YandexMapViewProps, YandexMapViewRef } from './ExpoYandexMapKit.types';
import { warnWebNotSupportedOnce } from './ExpoYandexMapKitModule.web';

// YandexMapView is not available on the web platform. The ref is exposed for type
// parity but its imperative methods are unavailable (they reject on web).
export const YandexMapView = React.forwardRef<YandexMapViewRef, YandexMapViewProps>(
  (_props, ref) => {
    warnWebNotSupportedOnce();
    React.useImperativeHandle(ref, () => {
      const unsupported = () =>
        Promise.reject(new Error('expo-yandex-mapkit: YandexMapView is not supported on web'));
      return {
        setCenter: unsupported,
        setZoom: unsupported,
        fitMarkers: unsupported,
        fitAllMarkers: unsupported,
        getCameraPosition: unsupported,
        getVisibleRegion: unsupported,
        getScreenPoints: unsupported,
        getWorldPoints: unsupported,
        fitToCoordinates: unsupported,
      };
    }, []);
    return null;
  }
);

YandexMapView.displayName = 'YandexMapView';
