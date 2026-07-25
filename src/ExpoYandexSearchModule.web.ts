import { registerWebModule, NativeModule } from 'expo';

import { Point, SearchOptions, SearchResult } from './ExpoYandexMapKit.types';
import { warnWebNotSupportedOnce } from './ExpoYandexMapKitModule.web';

// Search is not available on the web platform.
class ExpoYandexSearchModule extends NativeModule {
  async searchText(_query: string, _options?: SearchOptions): Promise<SearchResult[]> {
    warnWebNotSupportedOnce();
    return [];
  }

  async searchPoint(_point: Point, _options?: SearchOptions): Promise<SearchResult[]> {
    warnWebNotSupportedOnce();
    return [];
  }
}

export default registerWebModule(ExpoYandexSearchModule, 'ExpoYandexSearch');
