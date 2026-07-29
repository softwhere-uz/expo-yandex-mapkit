import type { CalloutProps } from './ExpoYandexMapKit.types';

// There is no native map on web (the map view web stub renders nothing), so a callout renders
// nothing too — it has no screen coordinate to anchor to.
export function Callout(_props: CalloutProps) {
  return null;
}

Callout.displayName = 'YandexCallout';
