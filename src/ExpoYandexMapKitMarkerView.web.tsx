import * as React from 'react';

import { MarkerProps, MarkerRef } from './ExpoYandexMapKit.types';

// There is no native map on web (the map view web stub warns once and renders nothing), so a
// marker renders nothing too. The ref methods resolve to no-ops so callers never throw.
export const Marker = React.forwardRef<MarkerRef, MarkerProps>((_props, ref) => {
  React.useImperativeHandle(
    ref,
    () => ({
      animatedMoveTo: async () => {},
      animatedRotateTo: async () => {},
      animateAlong: async () => {},
    }),
    []
  );
  return null;
});

Marker.displayName = 'YandexMarker';
