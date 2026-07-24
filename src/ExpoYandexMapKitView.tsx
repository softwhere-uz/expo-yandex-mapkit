import { requireNativeView } from 'expo';
import * as React from 'react';

import { YandexMapViewProps } from './ExpoYandexMapKit.types';

const NativeView: React.ComponentType<YandexMapViewProps> = requireNativeView('ExpoYandexMapKit');

export function YandexMapView(props: YandexMapViewProps) {
  return <NativeView {...props} />;
}
