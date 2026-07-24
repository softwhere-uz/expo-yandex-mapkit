import type { StyleProp, ViewStyle } from 'react-native';

export type Point = {
  latitude: number;
  longitude: number;
};

export type CameraPosition = {
  latitude: number;
  longitude: number;
  zoom: number; // MapKit zoom, ~0..21
  azimuth?: number; // degrees, default 0
  tilt?: number; // degrees, default 0
};

export type CameraPositionChangeEvent = {
  cameraPosition: Required<CameraPosition>;
  reason: 'gestures' | 'application';
  finished: boolean;
};

export type MapPressEvent = {
  point: Point;
};

export type YandexMapViewProps = {
  cameraPosition?: CameraPosition; // declarative: prop change moves the native camera
  animated?: boolean; // animate declarative moves, default true
  nightMode?: boolean; // default false
  scrollGesturesEnabled?: boolean; // pan the map by dragging, default true
  zoomGesturesEnabled?: boolean; // pinch / double-tap / two-finger tap zoom, default true
  tiltGesturesEnabled?: boolean; // two-finger vertical drag to tilt, default true
  rotateGesturesEnabled?: boolean; // two-finger twist to rotate, default true
  fastTapEnabled?: boolean; // report taps immediately instead of waiting for a possible double-tap, default true
  mapType?: 'none' | 'map' | 'satellite' | 'hybrid' | 'vector'; // base map layer; unset = SDK default (vector). 'satellite'/'hybrid' may need a Yandex-app key
  mapStyle?: string; // Yandex JSON style; only affects 'vector'/'hybrid' layers (no-op on raster 'map'/'satellite'); pass '' to clear
  onMapReady?: (event: { nativeEvent: Record<string, never> }) => void;
  onCameraPositionChanged?: (event: { nativeEvent: CameraPositionChangeEvent }) => void;
  onMapPress?: (event: { nativeEvent: MapPressEvent }) => void;
  onMapLongPress?: (event: { nativeEvent: MapPressEvent }) => void;
  style?: StyleProp<ViewStyle>;
};
