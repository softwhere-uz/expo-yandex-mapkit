import * as React from 'react';

import {
  GeojsonFeature,
  GeojsonGeometry,
  GeojsonInput,
  GeojsonPosition,
  GeojsonProps,
  Point,
} from './ExpoYandexMapKit.types';
import { Marker } from './ExpoYandexMapKitMarkerView';
import { Polygon } from './ExpoYandexMapKitPolygonView';
import { Polyline } from './ExpoYandexMapKitPolylineView';

// GeoJSON positions are [longitude, latitude] (RFC 7946); the map speaks { latitude, longitude }.
function toPoint(position: GeojsonPosition): Point {
  return { latitude: position[1], longitude: position[0] };
}

function toPoints(positions: GeojsonPosition[]): Point[] {
  return positions.map(toPoint);
}

// Normalize any GeoJSON input to a flat list of Features so a bare Geometry / single Feature works too.
function toFeatures(geojson: GeojsonInput): GeojsonFeature[] {
  if (geojson == null || typeof geojson !== 'object') {
    return [];
  }
  if (geojson.type === 'FeatureCollection') {
    return geojson.features ?? [];
  }
  if (geojson.type === 'Feature') {
    return [geojson];
  }
  // A bare Geometry — wrap it in a Feature with empty properties.
  return [{ type: 'Feature', geometry: geojson as GeojsonGeometry, properties: {} }];
}

/**
 * Renders a GeoJSON object as native map objects — pure-JS sugar over `<Marker>` / `<Polyline>` /
 * `<Polygon>` (the react-native-maps convention). Place it inside a `<YandexMapView>`:
 *
 * ```tsx
 * <YandexMapView cameraPosition={...}>
 *   <Geojson geojson={featureCollection} strokeColor="#1e88e5" fillColor="#1e88e533" />
 * </YandexMapView>
 * ```
 *
 * Point → `<Marker>`, LineString → `<Polyline>`, Polygon → `<Polygon>` (first ring outer, the rest
 * holes); the Multi* and GeometryCollection variants expand to several objects. `onPress` gives back
 * the source Feature.
 */
export function Geojson({
  geojson,
  markerSource,
  markerScale,
  strokeColor,
  strokeWidth,
  fillColor,
  zIndex,
  onPress,
}: GeojsonProps): React.ReactElement {
  const children: React.ReactNode[] = [];

  const renderGeometry = (
    geometry: GeojsonGeometry | null,
    feature: GeojsonFeature,
    keyPrefix: string
  ) => {
    if (geometry == null) {
      return;
    }
    const press = onPress ? () => onPress(feature) : undefined;
    switch (geometry.type) {
      case 'Point':
        children.push(
          <Marker
            key={keyPrefix}
            point={toPoint(geometry.coordinates)}
            source={markerSource}
            scale={markerScale}
            zIndex={zIndex}
            onPress={press}
          />
        );
        break;
      case 'MultiPoint':
        geometry.coordinates.forEach((position, i) =>
          children.push(
            <Marker
              key={`${keyPrefix}:${i}`}
              point={toPoint(position)}
              source={markerSource}
              scale={markerScale}
              zIndex={zIndex}
              onPress={press}
            />
          )
        );
        break;
      case 'LineString':
        children.push(
          <Polyline
            key={keyPrefix}
            points={toPoints(geometry.coordinates)}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            zIndex={zIndex}
            onPress={press}
          />
        );
        break;
      case 'MultiLineString':
        geometry.coordinates.forEach((line, i) =>
          children.push(
            <Polyline
              key={`${keyPrefix}:${i}`}
              points={toPoints(line)}
              strokeColor={strokeColor}
              strokeWidth={strokeWidth}
              zIndex={zIndex}
              onPress={press}
            />
          )
        );
        break;
      case 'Polygon': {
        const [outer, ...holes] = geometry.coordinates;
        children.push(
          <Polygon
            key={keyPrefix}
            points={toPoints(outer ?? [])}
            innerRings={holes.map(toPoints)}
            fillColor={fillColor}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            zIndex={zIndex}
            onPress={press}
          />
        );
        break;
      }
      case 'MultiPolygon':
        geometry.coordinates.forEach((polygon, i) => {
          const [outer, ...holes] = polygon;
          children.push(
            <Polygon
              key={`${keyPrefix}:${i}`}
              points={toPoints(outer ?? [])}
              innerRings={holes.map(toPoints)}
              fillColor={fillColor}
              strokeColor={strokeColor}
              strokeWidth={strokeWidth}
              zIndex={zIndex}
              onPress={press}
            />
          );
        });
        break;
      case 'GeometryCollection':
        geometry.geometries.forEach((child, i) =>
          renderGeometry(child, feature, `${keyPrefix}:${i}`)
        );
        break;
    }
  };

  toFeatures(geojson).forEach((feature, i) => renderGeometry(feature.geometry, feature, `f${i}`));

  return <>{children}</>;
}

Geojson.displayName = 'YandexGeojson';
