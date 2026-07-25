import { requireNativeView } from 'expo';
import * as React from 'react';
import { processColor } from 'react-native';

import { PolygonProps } from './ExpoYandexMapKit.types';

type NativePolygonProps = Omit<PolygonProps, 'fillColor' | 'strokeColor' | 'zIndex'> & {
  fillColor?: ReturnType<typeof processColor>;
  strokeColor?: ReturnType<typeof processColor>;
  zI?: number;
};

const NativePolygonView: React.ComponentType<NativePolygonProps> = requireNativeView(
  'ExpoYandexMapKit',
  'ExpoYandexMapKitPolygonView'
);

/** A polygon (with optional holes) rendered as a child of `YandexMapView`. */
export function Polygon({ fillColor, strokeColor, zIndex, ...props }: PolygonProps) {
  return (
    <NativePolygonView
      {...props}
      fillColor={processColor(fillColor)}
      strokeColor={processColor(strokeColor)}
      zI={zIndex}
    />
  );
}
