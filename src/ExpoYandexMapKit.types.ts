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

// Identifies a tapped built-in map object (a POI icon, a labelled toponym) precisely enough to
// (re)select it. The IDs are opaque MapKit values — read them off an `onPoiTap` event and pass the
// whole object back to the map ref's `selectGeoObject()` to draw MapKit's selection highlight.
export type GeoObjectSelection = {
  objectId: string;
  dataSourceName: string;
  layerId: string;
  groupId?: number;
};

// Payload for `onPoiTap` — a tap on one of the map's own labelled objects (a POI icon, a toponym).
// Distinct from `onMapPress` (a tap on blank map): a POI tap fires `onPoiTap` and does NOT also fire
// `onMapPress` — the react-native-maps `onPoiClick` convention. No Yandex-maps RN wrapper exposes
// this; their map taps return bare coordinates only.
export type PoiTapEvent = {
  name?: string; // the object's label, when MapKit provides one
  point?: Point; // the object's coordinate (its point geometry), when available
  selection: GeoObjectSelection; // pass to the map ref's `selectGeoObject()` to highlight this object
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
  minZoom?: number; // clamp the camera's minimum (most zoomed-out) zoom level; unset = MapKit default. Applies to gestures and programmatic moves.
  maxZoom?: number; // clamp the camera's maximum (most zoomed-in) zoom level; unset = MapKit default.
  mapType?: 'none' | 'map' | 'satellite' | 'hybrid' | 'vector'; // base map layer; unset = SDK default (vector). 'satellite'/'hybrid' may need a Yandex-app key
  mapStyle?: string; // Yandex JSON style; only affects 'vector'/'hybrid' layers (no-op on raster 'map'/'satellite'); pass '' to clear
  logoPosition?: { horizontal: 'left' | 'center' | 'right'; vertical: 'top' | 'bottom' }; // corner the mandatory Yandex logo aligns to
  logoPadding?: { horizontal: number; vertical: number }; // logo padding in px from the aligned edges (negatives clamped to 0)
  showUserPosition?: boolean; // show the device-location dot — requires the app to hold location permission; default false
  followUser?: boolean; // keep the camera centered on the user's location; default false
  // Custom icon for the user-location dot (used for both the resting pin and the heading arrow) —
  // require('./me.png') or { uri }. Requires showUserPosition; unset keeps MapKit's default dot.
  userLocationIcon?: ImageSourcePropType;
  userLocationIconScale?: number; // scale multiplier for userLocationIcon, default 1
  userLocationAccuracyFillColor?: ColorValue; // fill color of the accuracy circle around the dot
  userLocationAccuracyStrokeColor?: ColorValue; // stroke (border) color of the accuracy circle
  userLocationAccuracyStrokeWidth?: number; // accuracy-circle stroke width in points
  trafficVisible?: boolean; // show the live traffic-jams layer; default false
  // Persistent inset (in points) around the map's logical viewport — the react-native-maps
  // `mapPadding` convention. Shifts the map's optical center and the target of camera moves / gestures
  // so content stays clear of a bottom sheet, header, or floating controls. Applied as MapKit's
  // map-window focus rectangle. Unset = full viewport. `fitMarkers`/`fitAllMarkers` fall back to this
  // when their own `edgePadding` is omitted.
  mapPadding?: EdgePadding;
  onMapReady?: (event: { nativeEvent: Record<string, never> }) => void;
  onCameraPositionChanged?: (event: { nativeEvent: CameraPositionChangeEvent }) => void;
  onMapPress?: (event: { nativeEvent: MapPressEvent }) => void;
  onMapLongPress?: (event: { nativeEvent: MapPressEvent }) => void;
  // Fires when a built-in map POI / geo-object (a labelled place icon or toponym) is tapped, with
  // its name, coordinate, and a `selection` token for `selectGeoObject()`. A POI tap does not also
  // fire `onMapPress`.
  onPoiTap?: (event: { nativeEvent: PoiTapEvent }) => void;
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
  // Only meaningful inside a `<Clusterer>`: when true this marker is never merged into a cluster —
  // it stays a standalone placemark on the map regardless of zoom. Default false.
  excludeFromCluster?: boolean;
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

export type PolygonProps = {
  points: Point[]; // the outer ring's vertices (3+)
  innerRings?: Point[][]; // optional holes, each a ring of points
  fillColor?: ColorValue; // interior fill color
  strokeColor?: ColorValue; // border color
  strokeWidth?: number; // border width in points
  zIndex?: number; // draw order among map objects, default 0
  handled?: boolean; // when true a tap is consumed and does NOT also fire the map's onMapPress
  onPress?: (event: { nativeEvent: ShapePressEvent }) => void;
};

export type CircleProps = {
  center: Point; // the circle's center
  radius: number; // radius in meters
  fillColor?: ColorValue; // interior fill color
  strokeColor?: ColorValue; // border color
  strokeWidth?: number; // border width in points
  zIndex?: number; // draw order among map objects, default 0
  handled?: boolean; // when true a tap is consumed and does NOT also fire the map's onMapPress
  onPress?: (event: { nativeEvent: ShapePressEvent }) => void;
};

// Payload for a cluster badge tap — how many markers it groups and where its badge sits.
export type ClusterPressEvent = {
  size: number; // number of markers grouped under the tapped cluster (2+)
  point: Point; // the cluster badge's geographic position (the group's weighted center)
};

export type ClustererProps = {
  // Distance in points/dp within which markers merge into one cluster — larger groups more
  // aggressively. Default 60. (react-native-yamap-plus hardcodes 50; here it is configurable.)
  clusterRadius?: number;
  // Clustering applies at zoom levels at or below this value; zooming in past it splits a cluster
  // back into individual markers. Default 12. (yamap-plus hardcodes 12; here it is configurable.)
  minZoom?: number;
  // Cluster badge fill color. Default a blue (#3478F6).
  clusterColor?: ColorValue;
  // Cluster badge count-text color. Default white.
  clusterTextColor?: ColorValue;
  // Cluster badge count-text size in points. Default 13.
  clusterTextSize?: number;
  // Cluster badge diameter in points (grows for 3+ digit counts). Default 36. Ignored when
  // `clusterIcon` is set — a custom icon badge is drawn at the image's own size.
  clusterSize?: number;
  // Custom image for the cluster badge — require('./cluster.png') or { uri }. Replaces the drawn
  // color disc; the count is still drawn on top (honoring clusterTextColor/Size/Offset). Unset
  // draws the default color disc.
  clusterIcon?: ImageSourcePropType;
  // Nudges the count text within the badge, in points (positive x → right, positive y → down).
  // Default { x: 0, y: 0 } (centered). Applies to both the drawn disc and a `clusterIcon` badge.
  clusterTextOffset?: { x: number; y: number };
  // Whether tapping a cluster animates the camera to fit its markers. Default true.
  fitClusterOnPress?: boolean;
  // Fires when a cluster badge is tapped, with the cluster's size and center.
  onClusterPress?: (event: { nativeEvent: ClusterPressEvent }) => void;
  // The `<Marker>` children to cluster. Each marker keeps all its usual features (image or
  // React-children icon, `onPress`, `identifier`); an individual marker's `onPress` still fires
  // when it is shown un-clustered. Only `<Marker>` children are clustered — other map objects
  // (shapes) belong directly under the map, not inside a `<Clusterer>`.
  children?: ReactNode;
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
  // Draw MapKit's selection highlight around a built-in POI / geo-object. Pass the `selection`
  // carried by an `onPoiTap` event. No-op until the map is ready.
  selectGeoObject(selection: GeoObjectSelection): Promise<void>;
  // Clear any geo-object selection highlight drawn by `selectGeoObject()`.
  deselectGeoObject(): Promise<void>;
};

// ── Suggest (search-as-you-type) — requires the MapKit `full` flavor ────────────────────────────

export type SuggestOptions = {
  userPosition?: Point; // bias results toward this location
  boundingBox?: { southWest: Point; northEast: Point }; // bias/restrict results to this box
  suggestWords?: boolean; // also suggest query-word completions; default true
  types?: ('geo' | 'biz' | 'transit')[]; // which kinds of result to return; default all three
};

export type SuggestItem = {
  title: string; // primary label (e.g. a place or street name)
  subtitle?: string; // secondary label (e.g. the surrounding address)
  searchText: string; // the text to run a full search with if the user picks this item
  uri?: string; // an opaque MapKit URI for the object (resolve via search when center is absent)
  center?: Point; // the item's coordinate — read natively; present when MapKit provides one
  distance?: string; // human-readable distance from userPosition, when available
};

// ── Search & geocoding — requires the MapKit `full` flavor ───────────────────────────────────────

export type SearchOptions = {
  userPosition?: Point; // bias results toward this location
  boundingBox?: { southWest: Point; northEast: Point }; // search window for searchText (a box)
  searchTypes?: ('geo' | 'biz')[]; // toponyms and/or organizations; default ['geo']
  resultPageSize?: number; // max results in the first page
  zoom?: number; // reverse-geocoding detail level (searchPoint only)
  disableSpellingCorrection?: boolean; // turn off the "did you mean" spelling fixups; default false
  // Extra data to request for results. `'rating'` populates `SearchResult.rating` for organizations;
  // `'photos'` / `'panoramas'` are requested but their payloads aren't surfaced yet.
  snippets?: ('rating' | 'photos' | 'panoramas')[];
};

// One part of a structured address (a toponym result). `kinds` are snake_case, matching MapKit's
// address-component kinds, e.g. `country`, `province`, `area`, `locality`, `district`, `street`,
// `house`, `metro_station`, `railway_station`, `airport`, `hydro`, … (a component may carry more
// than one, e.g. `['station', 'metro_station']`).
export type AddressComponent = {
  name: string;
  kinds: string[];
};

export type SearchResult = {
  name?: string; // the object's name / short label
  description?: string; // a longer description, when provided
  point?: Point; // the object's coordinate (a toponym's balloon point, else its geometry)
  formattedAddress?: string; // the full address string for a toponym result
  addressComponents?: AddressComponent[]; // the structured address breakdown for a toponym result
  rating?: number; // organization rating 0–5 (only when the `'rating'` snippet was requested)
  ratingsCount?: number; // number of ratings backing `rating`
};

// ── Routing — requires the MapKit `full` flavor ──────────────────────────────────────────────────

export type RouteMode = 'driving' | 'masstransit' | 'pedestrian';

// One leg of a route. `type` is `'car'` (driving), `'walk'` / `'waiting'`, or a public-transport
// vehicle type (`'bus'`, `'underground'`, `'tramway'`, `'minibus'`, `'railway'`, …).
export type RouteSection = {
  type: string;
  time?: string; // formatted duration of this leg
  points: Point[]; // this leg's polyline geometry (a fragment of the route's line)
  transports?: Record<string, string[]>; // transit legs: vehicle type → the line names serving it
};

export type Route = {
  time?: string; // formatted total duration (e.g. "23 min")
  timeWithTraffic?: string; // driving: duration accounting for live traffic
  distance?: number; // driving: total distance in metres
  walkingDistance?: number; // masstransit / pedestrian: total walking distance in metres
  transfersCount?: number; // masstransit: number of transfers
  points: Point[]; // the route's polyline geometry (draw with <Polyline>)
  sections: RouteSection[]; // the route broken into legs (walk / transit / drive)
};
