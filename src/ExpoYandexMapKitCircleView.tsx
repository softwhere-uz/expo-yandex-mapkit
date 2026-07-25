import { requireNativeView } from 'expo';
import * as React from 'react';
import { processColor } from 'react-native';

import { CircleProps } from './ExpoYandexMapKit.types';

// `onPress` is forwarded to the native `onShapePress` event to avoid RN's reserved bubbling
// `topPress` (which collides with Expo's direct view events and red-screens on mount).
type NativeCircleProps = Omit<CircleProps, 'fillColor' | 'strokeColor' | 'zIndex' | 'onPress'> & {
  fillColor?: ReturnType<typeof processColor>;
  strokeColor?: ReturnType<typeof processColor>;
  zI?: number;
  onShapePress?: CircleProps['onPress'];
};

const NativeCircleView: React.ComponentType<NativeCircleProps> = requireNativeView(
  'ExpoYandexMapKit',
  'ExpoYandexMapKitCircleView'
);

/** A circle (center + radius in meters) rendered as a child of `YandexMapView`. */
export function Circle({ fillColor, strokeColor, zIndex, onPress, ...props }: CircleProps) {
  return (
    <NativeCircleView
      {...props}
      fillColor={processColor(fillColor)}
      strokeColor={processColor(strokeColor)}
      zI={zIndex}
      onShapePress={onPress}
    />
  );
}
