import { NativeModule, requireNativeModule } from 'expo';

import { SuggestItem, SuggestOptions } from './ExpoYandexMapKit.types';

// The Suggest native module. It is registered on both flavors: the `full` flavor provides the real
// implementation, while the `lite` flavor provides a stub whose `suggest` rejects with a clear
// "requires the full flavor" message. So this module is always present — no `requireNativeModule`
// failure on lite.
declare class ExpoYandexSuggestModule extends NativeModule {
  suggest(query: string, options?: SuggestOptions): Promise<SuggestItem[]>;
  reset(): void;
}

export default requireNativeModule<ExpoYandexSuggestModule>('ExpoYandexSuggest');
