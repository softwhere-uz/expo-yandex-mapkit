import { CircleProps } from './ExpoYandexMapKit.types';

// No native map on web — a circle renders nothing.
export function Circle(_props: CircleProps) {
  return null;
}
