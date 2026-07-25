import { registerWebModule, NativeModule } from 'expo';

import { Point, Route, RouteMode } from './ExpoYandexMapKit.types';
import { warnWebNotSupportedOnce } from './ExpoYandexMapKitModule.web';

// Routing is not available on the web platform.
class ExpoYandexTransportModule extends NativeModule {
  async findRoutes(_points: Point[], _mode: RouteMode): Promise<Route[]> {
    warnWebNotSupportedOnce();
    return [];
  }
}

export default registerWebModule(ExpoYandexTransportModule, 'ExpoYandexTransport');
