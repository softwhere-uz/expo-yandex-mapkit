// Reexport the native module. On web, it will be resolved to ExpoYandexMapKitModule.web.ts
// and on native platforms to ExpoYandexMapKitModule.ts
import ExpoYandexMapKitModule from './ExpoYandexMapKitModule';

export { YandexMapView } from './ExpoYandexMapKitView';
export { Marker } from './ExpoYandexMapKitMarkerView';
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
