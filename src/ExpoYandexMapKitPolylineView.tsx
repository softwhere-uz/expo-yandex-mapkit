import { requireNativeView } from 'expo';
import * as React from 'react';
import { processColor } from 'react-native';

import { PolylineProps } from './ExpoYandexMapKit.types';

// Colors are converted to native via processColor (matching the marker/shape convention); `zIndex`
// is sent as `zI` so React Native's layout zIndex doesn't intercept it.
type NativePolylineProps = Omit<PolylineProps, 'strokeColor' | 'outlineColor' | 'zIndex'> & {
  strokeColor?: ReturnType<typeof processColor>;
  outlineColor?: ReturnType<typeof processColor>;
  zI?: number;
};

const NativePolylineView: React.ComponentType<NativePolylineProps> = requireNativeView(
  'ExpoYandexMapKit',
  'ExpoYandexMapKitPolylineView'
);

/**
 * A polyline rendered on a `YandexMapView`. Place it as a child of the map:
 *
 * ```tsx
 * <YandexMapView cameraPosition={...}>
 *   <Polyline points={[a, b, c]} strokeColor="#f00" strokeWidth={4} />
 * </YandexMapView>
 * ```
 */
export function Polyline({ strokeColor, outlineColor, zIndex, ...props }: PolylineProps) {
  return (
    <NativePolylineView
      {...props}
      strokeColor={processColor(strokeColor)}
      outlineColor={processColor(outlineColor)}
      zI={zIndex}
    />
  );
}
