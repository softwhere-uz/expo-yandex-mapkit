import { requireNativeView } from 'expo';
import * as React from 'react';
import { processColor } from 'react-native';

import { CircleProps } from './ExpoYandexMapKit.types';

type NativeCircleProps = Omit<CircleProps, 'fillColor' | 'strokeColor' | 'zIndex'> & {
  fillColor?: ReturnType<typeof processColor>;
  strokeColor?: ReturnType<typeof processColor>;
  zI?: number;
};

const NativeCircleView: React.ComponentType<NativeCircleProps> = requireNativeView(
  'ExpoYandexMapKit',
  'ExpoYandexMapKitCircleView'
);

/** A circle (center + radius in meters) rendered as a child of `YandexMapView`. */
export function Circle({ fillColor, strokeColor, zIndex, ...props }: CircleProps) {
  return (
    <NativeCircleView
      {...props}
      fillColor={processColor(fillColor)}
      strokeColor={processColor(strokeColor)}
      zI={zIndex}
    />
  );
}
