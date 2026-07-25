// Reexport the native module. On web, it will be resolved to ExpoYandexMapKitModule.web.ts
// and on native platforms to ExpoYandexMapKitModule.ts
import type { SuggestItem, SuggestOptions } from './ExpoYandexMapKit.types';
import ExpoYandexMapKitModule from './ExpoYandexMapKitModule';
import ExpoYandexSuggestModule from './ExpoYandexSuggestModule';

export { YandexMapView } from './ExpoYandexMapKitView';
export { Marker } from './ExpoYandexMapKitMarkerView';
export { Clusterer } from './ExpoYandexMapKitClustererView';
export { Polyline } from './ExpoYandexMapKitPolylineView';
export { Polygon } from './ExpoYandexMapKitPolygonView';
export { Circle } from './ExpoYandexMapKitCircleView';
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
