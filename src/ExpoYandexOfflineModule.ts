import { NativeModule, requireNativeModule } from 'expo';

import { OfflineRegion } from './ExpoYandexMapKit.types';

// The Offline maps native module. Registered on both flavors: `full` provides the real
// implementation (OfflineCacheManager), `lite` a stub whose calls reject with a clear "requires the
// full flavor + a paid license" message.
declare class ExpoYandexOfflineModule extends NativeModule {
  getRegions(): Promise<OfflineRegion[]>;
  startDownload(regionId: number): Promise<void>;
  stopDownload(regionId: number): Promise<void>;
  pauseDownload(regionId: number): Promise<void>;
  dropRegion(regionId: number): Promise<void>;
  allowUseCellularNetwork(allow: boolean): Promise<void>;
  clearCache(): Promise<void>;
}

export default requireNativeModule<ExpoYandexOfflineModule>('ExpoYandexOffline');
