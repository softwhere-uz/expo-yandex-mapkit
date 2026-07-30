import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { MarkerViewProps } from './ExpoYandexMapKit.types';
import { useMapOverlay } from './useMapOverlay';

// A **live, interactive** React view positioned at a world coordinate — the @rnmapbox `MarkerView`
// convention. Unlike `<Marker>` (which snapshots its React children to a bitmap placemark icon, so
// they are static and non-interactive), `<MarkerView>` is a real React Native view that stays
// interactive and updates every render. It projects `point` to a screen position and repositions on
// every camera movement. Render it as a child of `<YandexMapView>`. Outside a map it renders nothing.
//
// Trade-off vs `<Marker>`: MarkerView positions in JS (world→screen per camera frame), so with many
// of them or heavy content it can lag a native placemark during fast gestures. Use `<Marker>` for
// large static sets; use `<MarkerView>` when you need live/interactive content (a few of them).
export function MarkerView({
  point,
  anchor,
  offset,
  children,
  style,
  pointerEvents,
  onPress,
}: MarkerViewProps) {
  const { hasContext, screen, size, onLayout } = useMapOverlay(point);

  if (!hasContext || !screen) {
    return null;
  }

  // Default anchor is the center of the view (a marker sits on the coordinate).
  const anchorX = anchor?.x ?? 0.5;
  const anchorY = anchor?.y ?? 0.5;
  const left = screen.x - size.width * anchorX + (offset?.x ?? 0);
  const top = screen.y - size.height * anchorY + (offset?.y ?? 0);

  const content = onPress ? <Pressable onPress={onPress}>{children}</Pressable> : children;

  return (
    <View
      pointerEvents={pointerEvents ?? 'box-none'}
      onLayout={onLayout}
      style={[styles.markerView, { left, top }, style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  markerView: { position: 'absolute' },
});

MarkerView.displayName = 'YandexMarkerView';
