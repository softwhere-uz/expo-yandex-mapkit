import type { ReactNode } from 'react';
import type { ColorValue, ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';

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
  children?: ReactNode; // <Marker> (and future map-object) children
};

// Icon anchor as fractions of the icon size: { x: 0.5, y: 1 } pins the icon's bottom-center
// to the coordinate (the usual "pin" placement). Each component is clamped to [0, 1] natively.
export type MarkerAnchor = {
  x: number;
  y: number;
};

export type MarkerPressEvent = {
  // The marker's `identifier` prop, echoed back so you can tell markers apart — the
  // identifying payload the lineage's marker press events never carried.
  identifier?: string;
  point: Point; // the marker's geographic position at tap time
};

export type MarkerProps = {
  point: Point; // geographic position of the marker (required)
  source?: ImageSourcePropType; // icon image — require('./pin.png') or { uri }; ignored when `children` are provided
  scale?: number; // icon scale multiplier, default 1
  anchor?: MarkerAnchor; // icon anchor in [0,1] fractions; unset uses the icon's own default
  visible?: boolean; // default true
  zIndex?: number; // draw order relative to other map objects, default 0
  rotated?: boolean; // when true the icon rotates with the map's azimuth, default false
  handled?: boolean; // when true a tap is consumed and does NOT also fire the map's onMapPress, default false
  identifier?: string; // opaque id echoed back in onPress — lets a shared handler identify the marker
  onPress?: (event: { nativeEvent: MarkerPressEvent }) => void;
  // React children rendered as the marker's icon (a custom pin). Takes precedence over `source`.
  children?: ReactNode;
  // Whether to re-render the icon when the `children` change. Default true. When the content has
  // settled (e.g. a static bubble), set false so the icon is snapshotted once — a large perf win
  // vs. re-snapshotting every frame (the react-native-maps convention, done reliably here).
  tracksViewChanges?: boolean;
};

// Imperative marker methods, called through a ref: `const ref = useRef<MarkerRef>(null)`.
export type MarkerRef = {
  // Animate the marker to `point` over `durationMs` milliseconds (linear). No-op until it is on the map.
  animatedMoveTo(point: Point, durationMs: number): Promise<void>;
  // Animate the marker's icon heading to `angle` degrees over `durationMs` milliseconds (linear).
  animatedRotateTo(angle: number, durationMs: number): Promise<void>;
};

// Payload for a shape's onPress — the tapped geographic point.
export type ShapePressEvent = { point: Point };

export type PolylineProps = {
  points: Point[]; // the line's vertices (2+)
  strokeColor?: ColorValue; // line color
  strokeWidth?: number; // line width in points, default per MapKit
  outlineColor?: ColorValue; // outline (border) color drawn under the stroke
  outlineWidth?: number; // outline width in points
  dashLength?: number; // dash segment length in points (with gapLength, makes a dashed line)
  gapLength?: number; // gap length between dashes in points
  dashOffset?: number; // starting offset of the dash pattern in points
  zIndex?: number; // draw order among map objects, default 0
  handled?: boolean; // when true a tap is consumed and does NOT also fire the map's onMapPress
  onPress?: (event: { nativeEvent: ShapePressEvent }) => void;
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

// Insets in React Native points (dp) that keep fitted markers clear of the map edges / overlays
// (e.g. a bottom sheet or header). Applied as a focus rectangle, so the fitted content sits inside
// these margins. Converted to device pixels natively via the screen density/scale.
export type EdgePadding = { top?: number; right?: number; bottom?: number; left?: number };

// Options for the fit-to-markers moves — the camera-move options plus optional edge padding.
export type FitOptions = CameraMoveOptions & { edgePadding?: EdgePadding };

// Imperative methods, called through a ref: `const ref = useRef<YandexMapViewRef>(null)`.
export type YandexMapViewRef = {
  // Animate/move the camera to `position`. Sets the FULL camera — omitting `azimuth`/`tilt`
  // resets them to 0 (flat, north-up), same as the `cameraPosition` prop. No-op until ready.
  setCenter(position: CameraPosition, options?: CameraMoveOptions): Promise<void>;
  // Animate the zoom, keeping the current center / azimuth / tilt.
  setZoom(zoom: number, options?: CameraMoveOptions): Promise<void>;
  // Move the camera so every point is visible, optionally inset by `edgePadding`. A single point
  // recenters at the current zoom.
  fitMarkers(points: Point[], options?: FitOptions): Promise<void>;
  // Move the camera so every mounted `<Marker>` is visible (optionally inset by `edgePadding`).
  // No-op when there are no markers; a single marker recenters at the current zoom.
  fitAllMarkers(options?: FitOptions): Promise<void>;
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
