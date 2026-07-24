// Reexport the native module. On web, it will be resolved to ExpoYandexMapKitModule.web.ts
// and on native platforms to ExpoYandexMapKitModule.ts
import ExpoYandexMapKitModule from './ExpoYandexMapKitModule';

export { YandexMapView } from './ExpoYandexMapKitView';
export * from './ExpoYandexMapKit.types';

// Escape hatch: the raw native module.
export { default as ExpoYandexMapKitModule } from './ExpoYandexMapKitModule';

/**
 * Initializes Yandex MapKit with the given API key.
 * Must resolve before any `YandexMapView` is rendered.
 */
export async function initialize(apiKey: string): Promise<void> {
  return ExpoYandexMapKitModule.initialize(apiKey);
}
