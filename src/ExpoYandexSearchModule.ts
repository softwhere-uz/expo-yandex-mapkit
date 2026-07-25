import { NativeModule, requireNativeModule } from 'expo';

import { Point, SearchOptions, SearchResult } from './ExpoYandexMapKit.types';

// The Search native module. Registered on both flavors: `full` provides the real implementation,
// `lite` a stub whose methods reject with a clear "requires the full flavor" message.
declare class ExpoYandexSearchModule extends NativeModule {
  searchText(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  searchPoint(point: Point, options?: SearchOptions): Promise<SearchResult[]>;
}

export default requireNativeModule<ExpoYandexSearchModule>('ExpoYandexSearch');
