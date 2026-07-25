import { NativeModule, requireNativeModule } from 'expo';

import { Point, Route, RouteMode } from './ExpoYandexMapKit.types';

// The Transport (routing) native module. Registered on both flavors: `full` provides the real
// implementation, `lite` a stub whose `findRoutes` rejects with a clear "requires the full flavor"
// message.
declare class ExpoYandexTransportModule extends NativeModule {
  findRoutes(points: Point[], mode: RouteMode): Promise<Route[]>;
}

export default requireNativeModule<ExpoYandexTransportModule>('ExpoYandexTransport');
