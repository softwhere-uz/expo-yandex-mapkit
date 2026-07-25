import { requireNativeView } from 'expo';
import * as React from 'react';
import { processColor } from 'react-native';

import { PolygonProps } from './ExpoYandexMapKit.types';

// `onPress` is forwarded to the native `onShapePress` event to avoid RN's reserved bubbling
// `topPress` (which collides with Expo's direct view events and red-screens on mount).
type NativePolygonProps = Omit<PolygonProps, 'fillColor' | 'strokeColor' | 'zIndex' | 'onPress'> & {
  fillColor?: ReturnType<typeof processColor>;
  strokeColor?: ReturnType<typeof processColor>;
  zI?: number;
  onShapePress?: PolygonProps['onPress'];
};

const NativePolygonView: React.ComponentType<NativePolygonProps> = requireNativeView(
  'ExpoYandexMapKit',
  'ExpoYandexMapKitPolygonView'
);

/** A polygon (with optional holes) rendered as a child of `YandexMapView`. */
export function Polygon({ fillColor, strokeColor, zIndex, onPress, ...props }: PolygonProps) {
  return (
    <NativePolygonView
      {...props}
      fillColor={processColor(fillColor)}
      strokeColor={processColor(strokeColor)}
      zI={zIndex}
      onShapePress={onPress}
    />
  );
}
