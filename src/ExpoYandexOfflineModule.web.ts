import { registerWebModule, NativeModule } from 'expo';

import { OfflineRegion, OfflineRegionState } from './ExpoYandexMapKit.types';
import { warnWebNotSupportedOnce } from './ExpoYandexMapKitModule.web';

// Offline maps are not available on the web platform.
class ExpoYandexOfflineModule extends NativeModule {
  async getRegions(): Promise<OfflineRegion[]> {
    warnWebNotSupportedOnce();
    return [];
  }
  async getRegionState(_regionId: number): Promise<OfflineRegionState> {
    warnWebNotSupportedOnce();
    return 'unsupported';
  }
  async getRegionProgress(_regionId: number): Promise<number> {
    warnWebNotSupportedOnce();
    return 0;
  }
  async startDownload(_regionId: number): Promise<void> {
    warnWebNotSupportedOnce();
  }
  async stopDownload(_regionId: number): Promise<void> {
    warnWebNotSupportedOnce();
  }
  async pauseDownload(_regionId: number): Promise<void> {
    warnWebNotSupportedOnce();
  }
  async dropRegion(_regionId: number): Promise<void> {
    warnWebNotSupportedOnce();
  }
  async allowUseCellularNetwork(_allow: boolean): Promise<void> {
    warnWebNotSupportedOnce();
  }
  async clearCache(): Promise<void> {
    warnWebNotSupportedOnce();
  }
}

export default registerWebModule(ExpoYandexOfflineModule, 'ExpoYandexOffline');
