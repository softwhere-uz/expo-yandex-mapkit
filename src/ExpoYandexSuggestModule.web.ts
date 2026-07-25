import { registerWebModule, NativeModule } from 'expo';

import { SuggestItem, SuggestOptions } from './ExpoYandexMapKit.types';
import { warnWebNotSupportedOnce } from './ExpoYandexMapKitModule.web';

// Suggest is not available on the web platform.
class ExpoYandexSuggestModule extends NativeModule {
  async suggest(_query: string, _options?: SuggestOptions): Promise<SuggestItem[]> {
    warnWebNotSupportedOnce();
    return [];
  }

  reset(): void {
    warnWebNotSupportedOnce();
  }
}

export default registerWebModule(ExpoYandexSuggestModule, 'ExpoYandexSuggest');
