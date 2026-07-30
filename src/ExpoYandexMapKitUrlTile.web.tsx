import type { UrlTileProps } from './ExpoYandexMapKit.types';

// There is no native map on web (the map view web stub renders nothing), so a tile layer does
// nothing too.
export function UrlTile(_props: UrlTileProps) {
  return null;
}

UrlTile.displayName = 'YandexUrlTile';
