import * as React from 'react';
import { LayoutChangeEvent, PixelRatio, Pressable, StyleSheet, View } from 'react-native';

import type { CalloutProps } from './ExpoYandexMapKit.types';
import { MapOverlayContext } from './ExpoYandexMapKitMapContext';

// A React balloon/callout anchored to a world coordinate. MapKit exposes no native callout, so this
// is a plain overlay `View`: it projects `point` to a screen pixel (via the map's `getScreenPoints`)
// and repositions on every camera movement. Render it as a child of `<YandexMapView>`, alongside
// your `<Marker>`s. Outside a map (no context) it renders nothing.
export function Callout({ point, anchor, offset, children, style, pointerEvents, onPress }: CalloutProps) {
  const context = React.useContext(MapOverlayContext);
  // Anchored screen position in React Native points (getScreenPoints returns physical pixels).
  const [screen, setScreen] = React.useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  const { latitude, longitude } = point;
  React.useEffect(() => {
    if (!context) {
      return;
    }
    let cancelled = false;
    const update = () => {
      context.getScreenPoints([{ latitude, longitude }]).then((points) => {
        if (cancelled) {
          return;
        }
        const projected = points[0];
        setScreen(
          projected
            ? { x: projected.x / PixelRatio.get(), y: projected.y / PixelRatio.get() }
            : null
        );
      });
    };
    update();
    const unsubscribe = context.subscribeCameraChange(update);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [context, latitude, longitude]);

  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) =>
      current.width === width && current.height === height ? current : { width, height }
    );
  }, []);

  if (!context || !screen) {
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
      style={[styles.callout, { left, top }, style]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  callout: { position: 'absolute' },
});

Callout.displayName = 'YandexCallout';
