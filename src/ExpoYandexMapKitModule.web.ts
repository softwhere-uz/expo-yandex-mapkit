import { registerWebModule, NativeModule } from 'expo';

let hasWarned = false;

// Shared by the web stubs so the warning is only printed once per session.
export function warnWebNotSupportedOnce() {
  if (!hasWarned) {
    hasWarned = true;
    console.warn(
      'expo-yandex-mapkit: web is not supported yet; a DOM-component fallback is planned'
    );
  }
}

// ExpoYandexMapKit is not available on the web platform.
class ExpoYandexMapKitModule extends NativeModule {
  async initialize(_apiKey: string): Promise<void> {
    warnWebNotSupportedOnce();
  }
}

export default registerWebModule(ExpoYandexMapKitModule, 'ExpoYandexMapKit');
