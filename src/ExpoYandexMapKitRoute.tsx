import * as React from 'react';

import { RouteProps, RouteSection } from './ExpoYandexMapKit.types';
import { Polyline } from './ExpoYandexMapKitPolylineView';

const DEFAULT_DRIVING = '#2d7ff9';
const DEFAULT_WALK = '#9aa0a6';
const DEFAULT_TRANSIT = '#00a05a';

function isWalk(type: string): boolean {
  return type === 'walk' || type === 'waiting';
}

/**
 * Draws a `Route` (from `findRoutes`) as native polylines — one `<Polyline>` per section, colored by
 * leg type (driving / walking / transit), with walking legs dashed. Place it inside a `<YandexMapView>`:
 *
 * ```tsx
 * const [route] = await findDrivingRoutes([a, b]);
 * // ...
 * <YandexMapView cameraPosition={...}>{route && <Route route={route} />}</YandexMapView>
 * ```
 *
 * Both Yandex-maps RN wrappers return route *data* and leave drawing to the app — this renders it out
 * of the box. Falls back to the route's whole `points` geometry when it has no `sections`.
 */
export function Route({
  route,
  strokeWidth = 6,
  drivingColor = DEFAULT_DRIVING,
  walkColor = DEFAULT_WALK,
  transitColor = DEFAULT_TRANSIT,
  outlineColor,
  zIndex,
  onPress,
}: RouteProps): React.ReactElement {
  // Prefer per-section geometry (colored per leg); fall back to the route's whole line as one section.
  const sections: RouteSection[] =
    route.sections && route.sections.length > 0
      ? route.sections
      : [{ type: 'car', points: route.points }];

  const press = onPress ? () => onPress() : undefined;

  return (
    <>
      {sections.map((section, index) => {
        // <Polyline> needs 2+ points; skip a degenerate/empty section.
        if (!section.points || section.points.length < 2) {
          return null;
        }
        const walk = isWalk(section.type);
        const color = section.type === 'car' ? drivingColor : walk ? walkColor : transitColor;
        return (
          <Polyline
            key={index}
            points={section.points}
            strokeColor={color}
            strokeWidth={strokeWidth}
            outlineColor={outlineColor}
            dashLength={walk ? 4 : undefined}
            gapLength={walk ? 6 : undefined}
            zIndex={zIndex}
            onPress={press}
          />
        );
      })}
    </>
  );
}

Route.displayName = 'YandexRoute';
