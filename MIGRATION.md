# Migrating from `react-native-yamap` / `react-native-yamap-plus`

This guide maps the [`react-native-yamap`](https://github.com/volga-volga/react-native-yamap) (volga-volga) and [`react-native-yamap-plus`](https://github.com/Qudaeo/react-native-yamap-plus) APIs to **`expo-yandex-mapkit`**. Both are the same Yandex MapKit SDK underneath, so the concepts line up — the differences are mostly naming (this library follows the `react-native-maps` conventions migrating developers expect), setup (a config plugin instead of manual native edits), and that ref methods return Promises instead of taking callbacks.

> Already on `react-native-maps`? The `react-native-maps` alias props/methods (`fitToCoordinates`, `onRegionChangeComplete`) are built in — see [react-native-maps aliases](#react-native-maps-aliases) below.

## Why migrate

- **English docs + types.** The lineage is Russian-only or undocumented; this library ships full English (and Russian) docs and complete TypeScript types.
- **A config plugin instead of manual native setup.** No `AndroidManifest.xml` / `AppDelegate` edits — the [#1 crash class in the lineage](https://github.com/Qudaeo/react-native-yamap-plus/issues/30) (init-order errors) is designed out.
- **CI against the real SDK** on every change (no incumbent has CI at all), so it keeps compiling as Kotlin / RN / MapKit move.
- **Beyond-parity features** no other wrapper ships: POI taps, draggable markers, `takeSnapshot`, `onUserLocationChange`, `<Geojson>`, `<Route>`, `<Callout>`, `<MarkerView>`, traffic events, geometry helpers, bicycle/scooter routing, and more.

## 1. Install & initialize

**Before** (`react-native-yamap`) — manual native setup + a runtime `init`:

```ts
import YaMap from 'react-native-yamap';
YaMap.init('YOUR_API_KEY'); // call once, before rendering a map
```

**After** — add the config plugin and (optionally) bake the key in at build time:

```jsonc
// app.json / app.config.js
{
  "plugins": [
    ["expo-yandex-mapkit", { "apiKey": "YOUR_API_KEY", "locale": "en_US", "flavor": "lite" }]
  ]
}
```

```bash
npx expo prebuild   # whole native setup; no manual AndroidManifest / AppDelegate edits
```

With a build-time `apiKey` the map **auto-initializes at startup** — you don't call anything. Prefer a runtime key? Omit it from the plugin and call `initialize` before rendering a map:

```ts
import { initialize } from 'expo-yandex-mapkit';
await initialize('YOUR_API_KEY');
```

Search / Suggest / Routing need the **`full`** flavor (`"flavor": "full"`); markers / shapes / clustering / traffic work on the default `lite`.

## 2. The map component

**Before:**

```tsx
import YaMap, { Marker } from 'react-native-yamap';

<YaMap
  ref={mapRef}
  style={{ flex: 1 }}
  initialRegion={{ lat: 41.31, lon: 69.24, zoom: 12 }}
  onMapLoaded={() => {}}
/>;
```

**After** — coordinates use `{ latitude, longitude }` (the `react-native-maps` convention), and the initial camera is `cameraPosition`:

```tsx
import { YandexMapView, Marker } from 'expo-yandex-mapkit';

<YandexMapView
  ref={mapRef}
  style={{ flex: 1 }}
  cameraPosition={{ latitude: 41.31, longitude: 69.24, zoom: 12 }}
  onMapLoaded={() => {}}
/>;
```

### Coordinates

Every coordinate changes from `{ lat, lon }` to `{ latitude, longitude }`. If you have a lot of data in the old shape, map it once at the boundary:

```ts
const toPoint = (p: { lat: number; lon: number }) => ({ latitude: p.lat, longitude: p.lon });
```

## 3. Component mapping

| `react-native-yamap` | `expo-yandex-mapkit` | Notes |
| --- | --- | --- |
| `<YaMap>` | `<YandexMapView>` | `initialRegion={{ lat, lon, zoom }}` → `cameraPosition={{ latitude, longitude, zoom }}`. |
| `<Marker point={{ lat, lon }}>` | `<Marker point={{ latitude, longitude }}>` | Image via `source`; **React-children icons** supported (reliable, with `tracksViewChanges`). |
| `<Polyline>` | `<Polyline>` | `points` use `{ latitude, longitude }`; supports dash + outline. |
| `<Polygon>` | `<Polygon>` | Holes via `innerRings`. |
| `<Circle>` | `<Circle>` | — |
| `ClusteredYamap` / clustering | `<Clusterer>` | Wrap the `<Marker>`s to cluster; each keeps its own `onPress` / icon. |
| Custom marker callout (none) | `<Callout>` / `<MarkerView>` | New: a React balloon, or a live interactive React view, over the map. |
| `Suggest` | `suggest()` | Function, not a static class; `full` flavor. |
| `Geocoder` | `searchText` / `searchPoint` / `geocodeAddress` / `geocodePoint` | `full` flavor. |

## 4. Imperative ref methods

Ref methods **return Promises** here (the lineage passes callbacks):

| Before (callback) | After (Promise) |
| --- | --- |
| `map.setCenter({ lat, lon, zoom }, azimuth, tilt, duration, animation)` | `await map.setCenter({ latitude, longitude, zoom }, { durationSeconds, animation })` |
| `map.setZoom(zoom, duration, animation)` | `await map.setZoom(zoom, { durationSeconds })` |
| `map.fitAllMarkers()` | `await map.fitAllMarkers(options?)` |
| `map.fitMarkers(points)` | `await map.fitMarkers(points, options?)` |
| `map.getCameraPosition(cb)` | `const pos = await map.getCameraPosition()` |
| `map.getVisibleRegion(cb)` | `const region = await map.getVisibleRegion()` |

```tsx
// Before
map.current.getCameraPosition((pos) => console.log(pos));

// After
const pos = await mapRef.current?.getCameraPosition();
```

## 5. Events

| Before | After | Payload |
| --- | --- | --- |
| `onMapLoaded` | `onMapLoaded` | Load statistics. |
| `onMapPress` | `onMapPress` | `{ point }`. |
| `onMapLongPress` | `onMapLongPress` | `{ point }`. |
| `onCameraPositionChange` / `-Change` | `onCameraPositionChanged` | Carries `reason` (gesture vs application) + `finished`. |
| — | `onPoiTap` | New: taps on built-in POIs/toponyms (beyond parity). |
| — | `onUserLocationChange` | New: the device's `{ point, accuracy }`. |
| — | `onRegionChangeComplete` | `react-native-maps` alias — see below. |

## 6. Routing, Search, Suggest

**Routing** — functions returning Promises (the `full` flavor):

```ts
// Before: YaMap.findRoutes([a, b], [], (routes) => {...})  // vehicles + callback
import { findRoutes, findDrivingRoutes } from 'expo-yandex-mapkit';

const routes = await findRoutes([a, b], 'masstransit'); // or 'driving' | 'pedestrian' | 'bicycle' | 'scooter'
const driving = await findDrivingRoutes([a, b], { avoidTolls: true, vehicleType: 'truck' });
```

Draw a route out of the box with the `<Route>` component (colored per leg) instead of hand-drawing polylines:

```tsx
import { Route } from 'expo-yandex-mapkit';
{route && <Route route={route} strokeWidth={6} />}
```

**Search / geocoding / suggest** — all Promise-returning functions (`full` flavor):

```ts
import { searchText, searchPoint, suggest } from 'expo-yandex-mapkit';

const results = await searchText('coffee', { userPosition: here });
const address = await searchPoint(here);          // reverse geocode
const items = await suggest('lenina');            // search-as-you-type
```

## react-native-maps aliases

If you are coming from (or share code with) `react-native-maps`, these are built in so common call sites need no change:

- **`fitToCoordinates(coordinates, { edgePadding?, animated? })`** — a map-ref method (alias for `fitMarkers`).
- **`onRegionChangeComplete`** — a prop that fires a `react-native-maps` `Region` (`{ latitude, longitude, latitudeDelta, longitudeDelta }`) after a camera move settles.

```tsx
<YandexMapView
  onRegionChangeComplete={(region) => setRegion(region)}
  ref={mapRef}
/>;
await mapRef.current?.fitToCoordinates(points, { edgePadding: { top: 40, left: 40, right: 40, bottom: 240 } });
```

## Gotchas

- **Coordinate keys**: `{ lat, lon }` → `{ latitude, longitude }` everywhere.
- **Init**: prefer the build-time `apiKey` (config plugin) — the map auto-initializes and the lineage's init-order crashes go away. Otherwise `await initialize(key)` before the first map.
- **Flavor**: Search / Suggest / Routing require `"flavor": "full"`; they reject with a clear message on `lite`.
- **Ref methods are async** — `await` them (or handle the Promise); they no longer take callbacks.
- **Locale**: set it once via the plugin's `locale` (build time) to avoid MapKit's set-language-before-init trap; `setLocale` at runtime has platform caveats (documented in the README).

Anything missing or unclear? Open an issue — this guide is meant to cover real migrations.
