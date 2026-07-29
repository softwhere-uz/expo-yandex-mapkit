import * as React from 'react';

import type { Point, ScreenPoint } from './ExpoYandexMapKit.types';

// Shared by `YandexMapView` (provider) and JS overlay children like `<Callout>` (consumers).
// MapKit has no native callout/balloon, so overlays are plain React views positioned over the map:
// they project their world coordinate to a screen pixel via `getScreenPoints` and reposition on
// every camera movement.
export interface MapOverlayContextValue {
  // Project world coordinates to screen pixels (map-view space) — mirrors the map ref's
  // `getScreenPoints`. Resolves `null` per point that cannot be projected.
  getScreenPoints: (points: Point[]) => Promise<(ScreenPoint | null)[]>;
  // Subscribe to camera movements (fires continuously during a gesture and once it settles).
  // Returns an unsubscribe function.
  subscribeCameraChange: (listener: () => void) => () => void;
}

// `null` outside a `YandexMapView` — overlay components render nothing in that case.
export const MapOverlayContext = React.createContext<MapOverlayContextValue | null>(null);
