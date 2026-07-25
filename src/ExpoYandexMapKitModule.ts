import { NativeModule, requireNativeModule } from 'expo';

declare class ExpoYandexMapKitModule extends NativeModule {
  initialize(apiKey: string): Promise<void>;
  setLocale(locale: string): Promise<void>;
  getLocale(): Promise<string | null>;
  resetLocale(): Promise<void>;
}

export default requireNativeModule<ExpoYandexMapKitModule>('ExpoYandexMapKit');
