import { NativeModule, requireNativeModule } from 'expo';

declare class ExpoYandexMapKitModule extends NativeModule {
  initialize(apiKey: string): Promise<void>;
}

export default requireNativeModule<ExpoYandexMapKitModule>('ExpoYandexMapKit');
