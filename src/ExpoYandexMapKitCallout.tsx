import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { CalloutProps } from './ExpoYandexMapKit.types';
import { useMapOverlay } from './useMapOverlay';

// A React balloon/callout anchored to a world coordinate. MapKit exposes no native callout, so this
// is a plain overlay `View`: it projects `point` to a screen pixel (via the map's `getScreenPoints`)
// and repositions on every camera movement. Render it as a child of `<YandexMapView>`, alongside
// your `<Marker>`s. Outside a map (no context) it renders nothing.
export function Callout({
  point,
  anchor,
  offset,
  children,
  style,
  pointerEvents,
  onPress,
}: CalloutProps) {
  const { hasContext, screen, size, onLayout } = useMapOverlay(point);

  if (!hasContext || !screen) {
    return null;
  }

  const anchorX = anchor?.x ?? 0.5;
  const anchorY = anchor?.y ?? 1;
  const left = screen.x - size.width * anchorX + (offset?.x ?? 0);
  const top = screen.y - size.height * anchorY + (offset?.y ?? 0);

  const content = onPress ? <Pressable onPress={onPress}>{children}</Pressable> : children;

  return (
    <View
      pointerEvents={pointerEvents ?? 'box-none'}
      onLayout={onLayout}
      style={[styles.callout, { left, top }, style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  callout: { position: 'absolute' },
});

Callout.displayName = 'YandexCallout';
