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
  onMapReady?: (event: { nativeEvent: Record<string, never> }) => void;
  onCameraPositionChanged?: (event: { nativeEvent: CameraPositionChangeEvent }) => void;
  onMapPress?: (event: { nativeEvent: MapPressEvent }) => void;
  onMapLongPress?: (event: { nativeEvent: MapPressEvent }) => void;
  style?: StyleProp<ViewStyle>;
};
