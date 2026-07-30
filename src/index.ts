// Reexport the native module. On web, it will be resolved to ExpoYandexMapKitModule.web.ts
// and on native platforms to ExpoYandexMapKitModule.ts
import type {
  DrivingRouteOptions,
  OfflineRegion,
  Point,
  Route,
  RouteMode,
  SearchOptions,
  SearchResult,
  SuggestItem,
  SuggestOptions,
} from './ExpoYandexMapKit.types';
import ExpoYandexMapKitModule from './ExpoYandexMapKitModule';
import ExpoYandexOfflineModule from './ExpoYandexOfflineModule';
import ExpoYandexSearchModule from './ExpoYandexSearchModule';
import ExpoYandexSuggestModule from './ExpoYandexSuggestModule';
import ExpoYandexTransportModule from './ExpoYandexTransportModule';

export { YandexMapView } from './ExpoYandexMapKitView';
export { Marker } from './ExpoYandexMapKitMarkerView';
export { Clusterer } from './ExpoYandexMapKitClustererView';
export { Polyline } from './ExpoYandexMapKitPolylineView';
export { Polygon } from './ExpoYandexMapKitPolygonView';
export { Circle } from './ExpoYandexMapKitCircleView';
// The `<Route>` component (a value) and the `Route` data type (re-exported below via `export *`)
// deliberately share a name — valid in TS (like a class merges a value + type), and convenient: you
// write `<Route route={route} />` where `route: Route`. eslint's import/export rule flags the
// same-name co-export, so it is silenced on both lines.
// eslint-disable-next-line import/export
export { Route } from './ExpoYandexMapKitRoute';
export { distanceBetween, pathLength, boundingBox } from './geometry';
export { Geojson } from './ExpoYandexMapKitGeojson';
export { Callout } from './ExpoYandexMapKitCallout';
export { MarkerView } from './ExpoYandexMapKitMarkerViewOverlay';
export { UrlTile } from './ExpoYandexMapKitUrlTile';
// eslint-disable-next-line import/export
export * from './ExpoYandexMapKit.types';

// Escape hatch: the raw native module.
export { default as ExpoYandexMapKitModule } from './ExpoYandexMapKitModule';

/**
 * Initializes Yandex MapKit with the given API key. Resolve it before rendering any
 * `YandexMapView` — a view rendered earlier stays empty and recovers automatically once
 * this resolves.
 *
 * Optional when the API key is supplied at build time via the config plugin's `apiKey`
 * option — MapKit then initializes automatically at app startup, so calling this is
 * unnecessary (and a no-op when called again with the same key). A build-time `locale`
 * is applied on this path too.
 */
export async function initialize(apiKey: string): Promise<void> {
  return ExpoYandexMapKitModule.initialize(apiKey);
}

/**
 * Sets the map display language at runtime, as `language` or `language_REGION`
 * (e.g. `"en_US"`, `"ru_RU"`, `"tr_TR"`).
 *
 * ⚠️ Platform caveats (MapKit SDK limitations, not this library's):
 * - **iOS** — takes effect only if set **once, before the first map is created** (before MapKit
 *   initializes). Changing it after a map exists has no effect until the app restarts.
 * - **Android** — a full app restart is required for the change to fully apply.
 *
 * For a language known at build time, prefer the config plugin's `locale` option, which applies
 * during startup and sidesteps this init-order trap entirely.
 */
export async function setLocale(locale: string): Promise<void> {
  return ExpoYandexMapKitModule.setLocale(locale);
}

/** The current map language (`language` / `language_REGION`), or `null` if following the device locale. */
export async function getLocale(): Promise<string | null> {
  return ExpoYandexMapKitModule.getLocale();
}

/** Clears any runtime/build-time locale so the map follows the device locale (same caveats as {@link setLocale}). */
export async function resetLocale(): Promise<void> {
  return ExpoYandexMapKitModule.resetLocale();
}

/**
 * Search-as-you-type suggestions for `query` (place / address / organization names).
 *
 * ⚠️ Requires the MapKit **full** flavor — set `flavor: 'full'` in the config plugin. On the `lite`
 * flavor this rejects with a clear message.
 *
 * Each {@link SuggestItem} carries its `center` coordinate directly (read natively) when MapKit
 * provides one; when it doesn't, use `uri` (resolve it via search) or run a full search with
 * `searchText`. Requires MapKit to be initialized (via {@link initialize} or a build-time key).
 */
export async function suggest(query: string, options?: SuggestOptions): Promise<SuggestItem[]> {
  return ExpoYandexSuggestModule.suggest(query, options);
}

/** Cancels the in-flight suggest request and resets the suggest session. No-op on the lite flavor. */
export function resetSuggest(): void {
  ExpoYandexSuggestModule.reset();
}

// Escape hatch: the raw Suggest native module.
export { default as ExpoYandexSuggestModule } from './ExpoYandexSuggestModule';

/**
 * Full-text search for `query` (places, addresses, organizations), returning {@link SearchResult}s.
 *
 * ⚠️ Requires the MapKit **full** flavor (`flavor: 'full'` in the config plugin); rejects on `lite`.
 * Requires MapKit to be initialized (via {@link initialize} or a build-time key). Pass
 * `options.boundingBox` (or `userPosition`) to focus the search area — otherwise it spans the world.
 */
export async function searchText(query: string, options?: SearchOptions): Promise<SearchResult[]> {
  return ExpoYandexSearchModule.searchText(query, options);
}

/**
 * Reverse geocoding: the objects at `point` (e.g. the address of a tapped location). Same flavor /
 * initialization requirements as {@link searchText}.
 */
export async function searchPoint(point: Point, options?: SearchOptions): Promise<SearchResult[]> {
  return ExpoYandexSearchModule.searchPoint(point, options);
}

/** Geocode an address string to coordinates — {@link searchText} restricted to toponyms (`geo`). */
export async function geocodeAddress(
  address: string,
  options?: SearchOptions
): Promise<SearchResult[]> {
  return ExpoYandexSearchModule.searchText(address, { ...options, searchTypes: ['geo'] });
}

/** Reverse-geocode a coordinate to an address — an alias for {@link searchPoint}. */
export async function geocodePoint(point: Point, options?: SearchOptions): Promise<SearchResult[]> {
  return ExpoYandexSearchModule.searchPoint(point, options);
}

/**
 * Resolves a MapKit object URI (e.g. a `ymapsbm1://…` from a {@link SuggestItem}'s `uri`) to full
 * {@link SearchResult}s — handy for getting coordinates/details when a suggestion had no `center`.
 * Same flavor / initialization requirements as {@link searchText}.
 */
export async function resolveURI(uri: string, options?: SearchOptions): Promise<SearchResult[]> {
  return ExpoYandexSearchModule.resolveURI(uri, options);
}

// Escape hatch: the raw Search native module.
export { default as ExpoYandexSearchModule } from './ExpoYandexSearchModule';

/**
 * Builds routes between `points` (2+ waypoints) for the given travel `mode` (`'driving'`,
 * `'masstransit'`, or `'pedestrian'`), resolving to one or more {@link Route}s ordered best-first.
 *
 * ⚠️ Requires the MapKit **full** flavor (`flavor: 'full'` in the config plugin); rejects on `lite`.
 * Requires MapKit to be initialized (via {@link initialize} or a build-time key). Draw a route with
 * `<Polyline points={route.points} />`.
 */
export async function findRoutes(
  points: Point[],
  mode: RouteMode,
  options?: DrivingRouteOptions
): Promise<Route[]> {
  return ExpoYandexTransportModule.findRoutes(points, mode, options ?? null);
}

/**
 * Driving routes between `points` — {@link findRoutes} with mode `'driving'`. Pass `options` to
 * avoid tolls / unpaved / highways, set a `departureTime`, or pick a `vehicleType` (taxi / truck / moto).
 */
export async function findDrivingRoutes(
  points: Point[],
  options?: DrivingRouteOptions
): Promise<Route[]> {
  return ExpoYandexTransportModule.findRoutes(points, 'driving', options ?? null);
}

/** Public-transport routes between `points` — {@link findRoutes} with mode `'masstransit'`. */
export async function findMasstransitRoutes(points: Point[]): Promise<Route[]> {
  return ExpoYandexTransportModule.findRoutes(points, 'masstransit', null);
}

/** Walking routes between `points` — {@link findRoutes} with mode `'pedestrian'`. */
export async function findPedestrianRoutes(points: Point[]): Promise<Route[]> {
  return ExpoYandexTransportModule.findRoutes(points, 'pedestrian', null);
}

/** Bicycle routes between `points` — {@link findRoutes} with mode `'bicycle'`. */
export async function findBicycleRoutes(points: Point[]): Promise<Route[]> {
  return ExpoYandexTransportModule.findRoutes(points, 'bicycle');
}

/** Scooter routes between `points` — {@link findRoutes} with mode `'scooter'`. */
export async function findScooterRoutes(points: Point[]): Promise<Route[]> {
  return ExpoYandexTransportModule.findRoutes(points, 'scooter');
}

// Escape hatch: the raw Transport (routing) native module.
export { default as ExpoYandexTransportModule } from './ExpoYandexTransportModule';

/**
 * Offline maps — download map regions for offline use (via MapKit's `OfflineCacheManager`).
 *
 * ⚠️ Requires the MapKit **full** flavor (`flavor: 'full'` in the config plugin) **and a paid Yandex
 * MapKit license** that permits offline caching — the free tier does not. On `lite` (or without a
 * license) the calls reject with a clear message. Progress / state are **polled** — call
 * `getRegions` to refresh the region list, e.g. after `onListUpdated`.
 */
export const offlineMaps = {
  /** List the regions MapKit offers for offline download. */
  getRegions: (): Promise<OfflineRegion[]> => ExpoYandexOfflineModule.getRegions(),
  /** Start (or resume) downloading a region. */
  startDownload: (regionId: number): Promise<void> => ExpoYandexOfflineModule.startDownload(regionId),
  /** Stop a region's download (does not delete what was already downloaded). */
  stopDownload: (regionId: number): Promise<void> => ExpoYandexOfflineModule.stopDownload(regionId),
  /** Pause a region's download (resume with `startDownload`). */
  pauseDownload: (regionId: number): Promise<void> => ExpoYandexOfflineModule.pauseDownload(regionId),
  /** Delete a region's downloaded data. */
  dropRegion: (regionId: number): Promise<void> => ExpoYandexOfflineModule.dropRegion(regionId),
  /** Allow (or forbid) downloading over a cellular connection. */
  allowUseCellularNetwork: (allow: boolean): Promise<void> =>
    ExpoYandexOfflineModule.allowUseCellularNetwork(allow),
  /** Clear the entire offline cache. */
  clearCache: (): Promise<void> => ExpoYandexOfflineModule.clearCache(),
};

// Escape hatch: the raw Offline (cache) native module.
export { default as ExpoYandexOfflineModule } from './ExpoYandexOfflineModule';
