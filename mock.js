// Jest mock preset for expo-yandex-mapkit. The library renders native views and calls native
// modules, which don't exist under jest — mock them so components that use the library render and
// its async functions resolve. In your jest setup file (or a test):
//
//   jest.mock('expo-yandex-mapkit', () => require('expo-yandex-mapkit/mock'));
//
// Components render their children inside a plain <View>, so trees mount and queries work; the
// imperative ref methods and the module functions are jest.fn()s (spyable) returning sensible
// defaults. Mirrors the react-native-maps testing convention.
const React = require('react');
const { View } = require('react-native');

// jest.fn when running under jest (spyable), else a plain passthrough so the module can be required
// outside a jest environment without throwing.
const fn = (impl) => (typeof jest !== 'undefined' ? jest.fn(impl) : impl || (() => {}));

// Imperative ref surfaces, mocked to resolve with harmless defaults.
const mapRef = {
  setCenter: fn(async () => {}),
  setZoom: fn(async () => {}),
  fitMarkers: fn(async () => {}),
  fitAllMarkers: fn(async () => {}),
  getCameraPosition: fn(async () => null),
  getVisibleRegion: fn(async () => null),
  getScreenPoints: fn(async () => []),
  getWorldPoints: fn(async () => []),
  addTileOverlay: fn(async () => 'tile-0'),
  removeTileOverlay: fn(async () => {}),
};

const markerRef = {
  animatedMoveTo: fn(async () => {}),
  animatedRotateTo: fn(async () => {}),
  animateAlong: fn(async () => {}),
};

// A component that renders its children in a <View>, optionally exposing `refValue` on its ref.
function mockComponent(displayName, refValue) {
  const Component = React.forwardRef(({ children, ...props }, ref) => {
    React.useImperativeHandle(ref, () => refValue || {}, []);
    return React.createElement(View, { ...props, ref: refValue ? undefined : ref }, children);
  });
  Component.displayName = displayName;
  return Component;
}

const YandexMapView = mockComponent('YandexMapView', mapRef);
const Marker = mockComponent('Marker', markerRef);
const Clusterer = mockComponent('Clusterer');
const Polyline = mockComponent('Polyline');
const Polygon = mockComponent('Polygon');
const Circle = mockComponent('Circle');
const Geojson = mockComponent('Geojson');
const Route = mockComponent('Route');
const Callout = mockComponent('Callout');
const MarkerView = mockComponent('MarkerView');
const UrlTile = mockComponent('UrlTile');

// The raw native modules (escape hatches) — enough shape that a consumer can spy on them.
const ExpoYandexMapKitModule = {
  initialize: fn(async () => {}),
  setLocale: fn(async () => {}),
  getLocale: fn(async () => null),
  resetLocale: fn(async () => {}),
};
const ExpoYandexSuggestModule = { suggest: fn(async () => []), reset: fn(() => {}) };
const ExpoYandexSearchModule = {
  searchText: fn(async () => []),
  searchPoint: fn(async () => []),
  resolveURI: fn(async () => []),
};
const ExpoYandexTransportModule = { findRoutes: fn(async () => []) };

module.exports = {
  YandexMapView,
  Marker,
  Clusterer,
  Polyline,
  Polygon,
  Circle,
  Geojson,
  Route,
  Callout,
  MarkerView,
  UrlTile,

  ExpoYandexMapKitModule,
  ExpoYandexSuggestModule,
  ExpoYandexSearchModule,
  ExpoYandexTransportModule,

  // Geometry helpers (pure — mocked to harmless defaults).
  distanceBetween: fn(() => 0),
  pathLength: fn(() => 0),
  boundingBox: fn(() => null),

  // Top-level functions.
  initialize: fn(async () => {}),
  setLocale: fn(async () => {}),
  getLocale: fn(async () => null),
  resetLocale: fn(async () => {}),
  suggest: fn(async () => []),
  resetSuggest: fn(() => {}),
  searchText: fn(async () => []),
  searchPoint: fn(async () => []),
  geocodeAddress: fn(async () => []),
  geocodePoint: fn(async () => []),
  resolveURI: fn(async () => []),
  findRoutes: fn(async () => []),
  findDrivingRoutes: fn(async () => []),
  findMasstransitRoutes: fn(async () => []),
  findPedestrianRoutes: fn(async () => []),
  findBicycleRoutes: fn(async () => []),
  findScooterRoutes: fn(async () => []),
};
