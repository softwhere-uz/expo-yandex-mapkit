import * as React from 'react';

import type { UrlTileProps } from './ExpoYandexMapKit.types';
import { MapOverlayContext } from './ExpoYandexMapKitMapContext';

// A custom raster tile layer (the react-native-maps `<UrlTile>` convention). Render it as a child of
// `<YandexMapView>`; it adds a MapKit tile layer whose tiles are fetched from `urlTemplate` (with
// `{x}`/`{y}`/`{z}` placeholders) and removes it on unmount. It draws nothing itself (the layer lives
// on the native map). Outside a map (no context) it does nothing.
export function UrlTile({
  id,
  urlTemplate,
  minZoom,
  maxZoom,
  transparent,
  cacheable,
}: UrlTileProps) {
  const context = React.useContext(MapOverlayContext);

  React.useEffect(() => {
    if (!context) {
      return;
    }
    let overlayId: string | undefined;
    let removed = false;
    context
      .addTileOverlay({ id, urlTemplate, minZoom, maxZoom, transparent, cacheable })
      .then((resolvedId) => {
        // If the component unmounted before the add resolved, remove it right away.
        if (removed) {
          context.removeTileOverlay(resolvedId);
          return;
        }
        overlayId = resolvedId;
      });
    return () => {
      removed = true;
      if (overlayId) {
        context.removeTileOverlay(overlayId);
      }
    };
  }, [context, id, urlTemplate, minZoom, maxZoom, transparent, cacheable]);

  return null;
}

UrlTile.displayName = 'YandexUrlTile';
