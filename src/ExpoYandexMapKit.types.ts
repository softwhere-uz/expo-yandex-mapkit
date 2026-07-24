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

export type MapLoadStatistics = {
  renderObjectCount: number; // number of map objects rendered
  tileMemoryUsage: number; // tile cache memory usage, in bytes
  // Load timings in the SDK's native units, which DIFFER by platform (iOS: seconds as a
  // float; Android: integer SDK units) — use as per-platform relative signals, not
  // cross-platform values.
  curZoomModelsLoaded: number;
  curZoomPlacemarksLoaded: number;
  curZoomLabelsLoaded: number;
  curZoomGeometryLoaded: number;
  delayedGeometryLoaded: number;
  fullyLoaded: number;
  fullyAppeared: number;
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
  interactiveDisabled?: boolean; // when true, disable all four movement gestures at once (overrides the individual *GesturesEnabled), default false
  mapType?: 'none' | 'map' | 'satellite' | 'hybrid' | 'vector'; // base map layer; unset = SDK default (vector). 'satellite'/'hybrid' may need a Yandex-app key
  mapStyle?: string; // Yandex JSON style; only affects 'vector'/'hybrid' layers (no-op on raster 'map'/'satellite'); pass '' to clear
  logoPosition?: { horizontal: 'left' | 'center' | 'right'; vertical: 'top' | 'bottom' }; // corner the mandatory Yandex logo aligns to
  logoPadding?: { horizontal: number; vertical: number }; // logo padding in px from the aligned edges (negatives clamped to 0)
  onMapReady?: (event: { nativeEvent: Record<string, never> }) => void;
  onCameraPositionChanged?: (event: { nativeEvent: CameraPositionChangeEvent }) => void;
  onMapPress?: (event: { nativeEvent: MapPressEvent }) => void;
  onMapLongPress?: (event: { nativeEvent: MapPressEvent }) => void;
  onMapLoaded?: (event: { nativeEvent: MapLoadStatistics }) => void; // fires once the map finishes loading, with render stats
  style?: StyleProp<ViewStyle>;
};

export type ScreenPoint = {
  x: number; // pixels from the left of the map view
  y: number; // pixels from the top of the map view
};

export type VisibleRegion = {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
};

export type CameraMoveOptions = {
  durationSeconds?: number; // animation length in seconds; 0 = instant. Default 0.3
  animation?: 'smooth' | 'linear'; // easing, default 'smooth'
};

// Imperative methods, called through a ref: `const ref = useRef<YandexMapViewRef>(null)`.
export type YandexMapViewRef = {
  // Animate/move the camera to `position`. Sets the FULL camera — omitting `azimuth`/`tilt`
  // resets them to 0 (flat, north-up), same as the `cameraPosition` prop. No-op until ready.
  setCenter(position: CameraPosition, options?: CameraMoveOptions): Promise<void>;
  // Animate the zoom, keeping the current center / azimuth / tilt.
  setZoom(zoom: number, options?: CameraMoveOptions): Promise<void>;
  // Move the camera so every point is visible. A single point recenters at the current zoom.
  fitMarkers(points: Point[], options?: CameraMoveOptions): Promise<void>;
  // Current camera position, or null if the map is not ready.
  getCameraPosition(): Promise<Required<CameraPosition> | null>;
  // The geographic quad currently visible, or null if the map is not ready.
  getVisibleRegion(): Promise<VisibleRegion | null>;
  // Project world coordinates to screen points. Each result is null when the point
  // cannot be projected (off-globe / behind the camera).
  getScreenPoints(points: Point[]): Promise<(ScreenPoint | null)[]>;
  // Project screen points to world coordinates. Each result is null when unprojectable.
  getWorldPoints(points: ScreenPoint[]): Promise<(Point | null)[]>;
};
