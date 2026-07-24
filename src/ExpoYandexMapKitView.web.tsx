import { YandexMapViewProps } from './ExpoYandexMapKit.types';
import { warnWebNotSupportedOnce } from './ExpoYandexMapKitModule.web';

// YandexMapView is not available on the web platform.
export function YandexMapView(_props: YandexMapViewProps) {
  warnWebNotSupportedOnce();
  return null;
}
