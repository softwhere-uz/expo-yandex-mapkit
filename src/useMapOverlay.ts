import * as React from 'react';
import { LayoutChangeEvent, PixelRatio } from 'react-native';

import type { Point } from './ExpoYandexMapKit.types';
import { MapOverlayContext } from './ExpoYandexMapKitMapContext';

// Shared by the JS overlay components (`<Callout>`, `<MarkerView>`): projects `point` to a screen
// position in React Native points (getScreenPoints returns physical pixels) and keeps it in sync
// with every camera movement, while tracking the overlay's own measured size for anchoring.
export function useMapOverlay(point: Point) {
  const context = React.useContext(MapOverlayContext);
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

  return { hasContext: context != null, screen, size, onLayout };
}
