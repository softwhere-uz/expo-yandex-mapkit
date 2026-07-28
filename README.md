# expo-yandex-mapkit

**English** | [Русский](./README.ru.md)

<p align="center">
  <img src="https://raw.githubusercontent.com/softwhere-uz/expo-yandex-mapkit/main/media/social-card.png" alt="expo-yandex-mapkit — Yandex Maps for Expo: native, maintained, full-flavor" width="820">
</p>

Yandex Maps (MapKit) for Expo — built on the Expo Modules API, configured by a config plugin, New Architecture ready.

[![npm version](https://img.shields.io/npm/v/expo-yandex-mapkit.svg)](https://www.npmjs.com/package/expo-yandex-mapkit)
[![license](https://img.shields.io/npm/l/expo-yandex-mapkit.svg)](./LICENSE)
[![CI](https://github.com/softwhere-uz/expo-yandex-mapkit/actions/workflows/ci.yaml/badge.svg)](https://github.com/softwhere-uz/expo-yandex-mapkit/actions/workflows/ci.yaml)

📝 **Writeup:** [Yandex Maps in Expo, in 2026 — a maintained, native SDK](https://medium.com/@kamuranbek1998/yandex-maps-in-expo-in-2026-a-maintained-native-sdk-e7e3d8e25165)

## Features

A complete Yandex Maps SDK for Expo — full feature parity with the most capable community wrapper ([tracked in #1](https://github.com/softwhere-uz/expo-yandex-mapkit/issues/1)), built on the Expo Modules API, New-Architecture ready, and configured entirely by a config plugin. Everything below works on **both platforms** with identical JS.

**Map & camera**
- 🗺️ Native MapKit `<YandexMapView>` (Fabric / New Architecture)
- 🎥 Declarative, animatable camera (`cameraPosition`) + imperative ref methods — `setCenter`, `setZoom`, `fitMarkers` / `fitAllMarkers` (with edge padding), `getCameraPosition`, `getVisibleRegion`, world↔screen projection, `takeSnapshot`; persistent `mapPadding` for bottom-sheet / header layouts
- 👆 Press / long-press / camera-move / map-loaded events with identical payloads on iOS and Android
- 📌 **POI taps** (`onPoiTap`) — tap a built-in place icon to get its name + coordinate, then highlight it with `selectGeoObject()` (**beyond parity — no other Yandex-maps RN wrapper exposes this**)
- 🎨 `mapType` (`map` / `satellite` / `hybrid` / `vector`), JSON `mapStyle`, night mode, per-gesture toggles, `minZoom` / `maxZoom` bounds, logo placement

**Map objects** (declarative children of the map)
- 📍 `<Marker>` — image **or React-children** icons (reliable, with a `tracksViewChanges` re-snapshot pipeline), `onPress` with an identifying payload, `draggable` + drag events, `animatedMoveTo` / `animatedRotateTo` / `animateAlong`
- 〰️ `<Polyline>` (dash + outline), `<Polygon>` (holes via `innerRings`), `<Circle>`, `<Geojson>` (expands a GeoJSON object into map objects)
- 🔵 `<Clusterer>` — declarative clustering where your own `<Marker>`s are the render-prop; custom badge (color / size / **icon**), `excludeFromCluster`, tap-to-fit, configurable radius / minZoom
- 📡 User-location layer (custom dot icon + accuracy-circle styling, `onUserLocationChange` coordinates) and a live 🚦 traffic layer

**Full-flavor modules** — set `flavor: 'full'` ([lite vs full](#lite-vs-full))
- 🔎 **Search & geocoding** — `searchText`, `searchPoint` (reverse), `geocodeAddress` / `geocodePoint`, `resolveURI`; structured `addressComponents`, business `rating`, spelling / snippets options
- ⌨️ **Suggest** — search-as-you-type; coordinates read **natively** (no lost `center`)
- 🧭 **Routing** — `findRoutes` for driving / masstransit / pedestrian, with a per-section leg breakdown (walk → bus → transfer → metro); draw it with the `<Route>` component (colored per leg)

**Setup & DX**
- 🔑 API key at **build time** (config plugin) or **runtime** (`initialize`) — no `AndroidManifest.xml` / `AppDelegate` edits; a build-time key auto-initializes at startup (no init-order footgun)
- 🔧 One config plugin: MapKit version, `lite`/`full` flavor, API key, map `locale`, location permission, Android minSdk floor (per-platform overrides for all) — `npx expo prebuild` is the whole setup
- 📦 Also installable as the scoped alias [`@softwhere-uz/expo-yandex-mapkit`](https://www.npmjs.com/package/@softwhere-uz/expo-yandex-mapkit) · 🌍 docs in [English](./README.md) + [Russian](./README.ru.md)

## Status

**Stable — feature-complete.** The library reached full parity with [`react-native-yamap-plus`](https://github.com/Qudaeo/react-native-yamap-plus)'s surface (and does several things better) across `1.0.0` → `2.0.0`; the parity checklist ([#1](https://github.com/softwhere-uz/expo-yandex-mapkit/issues/1)) is closed. The entire surface — including the `full`-flavor Search / Suggest / Routing — is **runtime-verified on iOS** and compiles against the real MapKit SDK on both platforms in CI. Follows [semver](https://semver.org/): additive changes bump minor, so upgrading within `2.x` needs no migration.

| Phase | Scope | Status |
| --- | --- | --- |
| v0 | MapView, camera + events, night mode, image & React-children markers, imperative ref methods | ✅ **Complete** |
| v1 | Polylines / polygons / circles, clustering, user location, traffic, JSON styling, locale | ✅ **Complete** (1.0.0) |
| v2 | `full`-flavor modules: Search + geocoding, Suggest, Routing | ✅ **Complete** (1.1.0 → 2.0.0) |
| v3 | [Mappable](https://github.com/mappable-world) dual-brand support; `expo-yandex-mapkit-dom` — a DOM-component fallback so a map can render in Expo Go and on web | Planned |

## Why

- Yandex does not officially support React Native (Flutter gets a first-party plugin; React Native does not).
- Expo's own [`expo-maps`](https://docs.expo.dev/versions/latest/sdk/maps/) supports Apple Maps and Google Maps only, with no mechanism for third-party providers.
- The existing community wrappers each fall short in some way — no longer maintained, source unavailable, or documented in a single language. All of them did valuable groundwork; none covers the whole intersection.

This project aims to be the maintained, open-source option documented in both English and Russian: Expo Modules API, a real config plugin, both React Native architectures, and a current MapKit pin.

## Alternatives

An honest comparison, as of July 2026. This library now **matches the incumbents on feature depth** (full parity — markers, shapes, clustering, user location, traffic, search, suggest, routing) while adding the Expo Modules API, a real config plugin, both React Native architectures, and English + Russian docs.

| | `expo-yandex-mapkit` (this) | [`react-native-yamap-plus`](https://github.com/Qudaeo/react-native-yamap-plus) | `@yoyomobility/expo-yandex-maps` | [`react-native-yamap`](https://github.com/volga-volga/react-native-yamap) |
| --- | --- | --- | --- | --- |
| Actively maintained | ✓ | ✓ | ✓ | — (no release since Nov 2024) |
| Open source | ✓ MIT | ✓ MIT | — (source repo unavailable) | source public, no license declared |
| Expo Modules API | ✓ | — (TurboModules) | ✓ | — (legacy bridge) |
| Expo config plugin | ✓ (version, flavor, minSdk, API key, locale) | ✓ (flavor) | — (manual setup) | — (manual native edits) |
| New Architecture | ✓ | ✓ (v5+) | ✓ | — |
| Documentation | English + Russian | Russian | partial English | partial |
| Extra peer dependencies | none | none | `react-native-reanimated ^4` | none |
| Feature depth today | **full** (markers, shapes, clustering, user location, traffic, search, suggest, routing) | deep (markers, shapes, routing…) | deep (clustering, routing…) | deepest, but broken on current Expo SDKs |

## Compatibility

| | Requirement |
| --- | --- |
| Expo SDK | Built and CI-tested on **SDK 57 (RN 0.86, New Architecture)**. Supports **SDK 55+ (RN 0.83+)** — the floor declared in `peerDependencies`. |
| Android | minSdk **26** (Android 8.0) — enforced by the config plugin. |
| iOS | iOS **16.4+** — the config plugin raises the deployment target automatically (SDK 55/56 default lower). CocoaPods only — MapKit ships no SPM package. |
| MapKit | Defaults to **4.42.0**; override via the [config plugin](#2-add-the-config-plugin). Yandex recommends staying current. |
| Expo Go | Not supported (native code) — use a [development build](https://docs.expo.dev/develop/development-builds/introduction/). |
| Bare React Native | Supported via Expo Modules — see [Bare React Native](#bare-react-native). |

## Installation

```sh
npx expo install expo-yandex-mapkit
```

Prefer scoped installs? `@softwhere-uz/expo-yandex-mapkit` is the official alias — it re-exports this package (including the config plugin) and tracks it automatically.

### 1. Get an API key

Create an API key for the **MapKit Mobile SDK** in the [Yandex Developer Dashboard](https://developer.tech.yandex.ru/services/) (see the [MapKit documentation](https://yandex.com/dev/mapkit/doc/en/)). Supply it either way — no `AndroidManifest.xml` or `AppDelegate` edits are needed:

- **Build-time** — pass `apiKey` to the config plugin (below). MapKit initializes automatically at app startup, so you skip [`initialize`](#initializeapikey-string-promisevoid) entirely and render `<YandexMapView />` without any ready-gating. Simplest, and it removes the init-order footgun.
- **Runtime** — call [`initialize(apiKey)`](#initializeapikey-string-promisevoid) once before rendering. Use this when the key is only known at runtime (fetched from your backend, chosen per-environment, etc.).

### 2. Add the config plugin

In `app.json` / `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-yandex-mapkit",
        { "apiKey": "YOUR_MAPKIT_API_KEY", "locale": "en_US", "flavor": "lite", "version": "4.42.0" }
      ]
    ]
  }
}
```

All options are optional:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `apiKey` | `string` | — | Build-time MapKit API key. When set, MapKit initializes automatically at startup and calling [`initialize`](#initializeapikey-string-promisevoid) is unnecessary. Omit it to supply the key at runtime instead. |
| `locale` | `string` | — | Map display language as `language` or `language_REGION` (e.g. `"en_US"`, `"ru_RU"`, `"tr_TR"`). Omit to follow the device locale. Applied on the runtime path too. |
| `version` | `string` | `"4.42.0"` | Native MapKit SDK version (`x.y.z`). |
| `flavor` | `"lite" \| "full"` | `"lite"` | MapKit flavor — see [lite vs full](#lite-vs-full). |
| `locationWhenInUsePermission` | `string` | — | Usage-description for the location permission the user-location layer (`showUserPosition` / `followUser`) needs. When set, it is written to iOS `NSLocationWhenInUseUsageDescription` and adds `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` to the Android manifest. Omit it if your app requests location itself (e.g. via expo-location) or does not show the user's position. |
| `android` | `{ version?, flavor?, apiKey?, locale? }` | — | Android-only overrides; take precedence over the top-level values. |
| `ios` | `{ version?, flavor?, apiKey?, locale? }` | — | iOS-only overrides; take precedence over the top-level values. |

The plugin also raises `android.minSdkVersion` to 26 if it is missing or lower — MapKit requires Android API 26. It never lowers an existing higher value.

> **Where the key goes.** `apiKey`/`locale` are written to `AndroidManifest.xml` `<meta-data>` and iOS `Info.plist`; the native module reads them at startup. A MapKit key is a client-side credential (restricted by app id / signature in the Yandex dashboard, not a secret), so committing it is the same trade-off as Google Maps' manifest key. If you would rather keep it out of source, use an [`app.config.js`](https://docs.expo.dev/workflow/configuration/) that reads `process.env` for `apiKey`, or the runtime `initialize(apiKey)` path.

### 3. Build

```sh
npx expo prebuild
npx expo run:android   # or: npx expo run:ios
```

or build a [development build](https://docs.expo.dev/develop/development-builds/introduction/) with EAS.

> **This library does not run in Expo Go.** It contains native code, so you need a development build or `expo run:*`. A DOM-component fallback for Expo Go is planned (see the roadmap). On web, the current build warns once and renders nothing rather than crashing.

## Bare React Native

This library is built on the [Expo Modules API](https://docs.expo.dev/modules/overview/) and works in bare React Native apps — no `expo prebuild` required. The full `expo` package is a hard requirement (it provides the module system, the autolinking that discovers this library, and the `ExpoAppDelegate`/`ExpoReactHostFactory` wiring); `expo-modules-core` alone is not a supported path.

**1. Install Expo modules.** For React Native **0.85 and older**:

```sh
npx install-expo-modules@latest
```

For React Native **0.86**, `install-expo-modules` does not support your RN version yet (as of July 2026 it exits with "Unable to find compatible Expo SDK version") — follow Expo's [manual installation steps](https://docs.expo.dev/bare/installing-expo-modules/) instead, then `npm install expo@^57.0.0`. Keep the pairing exact: SDK 57 ↔ RN 0.86, SDK 56 ↔ RN 0.85, SDK 55 ↔ RN 0.83 — do not mix.

> The tool is optional on any RN version: it is only a codemod over those documented manual edits (`use_expo_modules!` in the Podfile, `ExpoAppDelegate`, the `expo-autolinking-settings`/`expo-root-project` Gradle plugins, the `MainApplication`/`MainActivity` wrappers), and applying them by hand is equally supported — that is exactly how this library's bare-RN verification app was wired. The one thing you cannot skip is the `expo` package dependency itself.

**2. Install the library.** `npm install expo-yandex-mapkit`. Expo autolinking discovers it via its `expo-module.config.json` — no pod entries, Gradle includes, or manifest edits.

**3. Android — set `minSdkVersion` to 26** in the `ext` block of `android/build.gradle`:

```diff
     ext {
-        minSdkVersion = 24
+        minSdkVersion = 26
```

> In bare apps, `android.minSdkVersion=26` in `gradle.properties` is **not** enough — the template's `ext` block takes precedence. Edit the `ext` line itself.

**4. Android — optionally pin the MapKit version/flavor** in `android/gradle.properties` (defaults: `4.42.0`, `lite`):

```properties
expoYandexMapKit.version=4.42.0
expoYandexMapKit.flavor=lite
```

**5. iOS — deployment target 16.4+**: make sure `ios/Podfile` has `platform :ios, '16.4'` (RN 0.86's default is 15.1) and your Xcode targets match — otherwise `pod install` fails with a minimum-deployment-target error.

**6. iOS — optionally pin the MapKit version/flavor**: create `ios/Podfile.properties.json` (recommended — committed, so CI/EAS builds are deterministic):

```json
{ "expoYandexMapKit.version": "4.42.0", "expoYandexMapKit.flavor": "lite" }
```

or export `EXPO_YANDEX_MAPKIT_VERSION` / `EXPO_YANDEX_MAPKIT_FLAVOR` when running `pod install` — the env vars win over the file, and on EAS/CI they must be present in the environment of the pod-install step itself (e.g. the build profile's `env`).

**7. Build and run.** `npx pod-install`, then `npx react-native run-android` / `run-ios` (or `npx expo run:*` if you accepted the Expo CLI integration). Then [`initialize`](#initializeapikey-string-promisevoid) and render as usual — the runtime API key needs no native edits in bare apps either.

A complete, manually wired reference app lives in [`bare-example/`](./bare-example) — every edit above as real code, built by CI on both platforms against the packed npm tarball on every change. If anything in your setup deviates, [Expo's bare guide](https://docs.expo.dev/bare/installing-expo-modules/) is the authority for step 1.

## Usage

```tsx
import { initialize, YandexMapView } from 'expo-yandex-mapkit';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

export default function App() {
  const [mapKitReady, setMapKitReady] = useState(false);

  useEffect(() => {
    initialize(process.env.EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY ?? 'YOUR_MAPKIT_API_KEY')
      .then(() => setMapKitReady(true))
      .catch((error) => console.warn('MapKit failed to initialize', error));
  }, []);

  if (!mapKitReady) {
    return null;
  }

  return (
    <YandexMapView
      style={StyleSheet.absoluteFill}
      cameraPosition={{ latitude: 41.311081, longitude: 69.240562, zoom: 12 }}
      onMapReady={() => console.log('map ready')}
      onCameraPositionChanged={({ nativeEvent }) => console.log(nativeEvent.cameraPosition)}
      onMapPress={({ nativeEvent }) => console.log('press', nativeEvent.point)}
      onMapLongPress={({ nativeEvent }) => console.log('long press', nativeEvent.point)}
    />
  );
}
```

With a **build-time** `apiKey` (config plugin), there is no initialization step — render the map directly:

```tsx
import { YandexMapView } from 'expo-yandex-mapkit';
import { StyleSheet } from 'react-native';

export default function App() {
  return (
    <YandexMapView
      style={StyleSheet.absoluteFill}
      cameraPosition={{ latitude: 41.311081, longitude: 69.240562, zoom: 12 }}
    />
  );
}
```

The full version (night-mode toggle included) lives in [`example/`](./example).

## API reference

### `initialize(apiKey: string): Promise<void>`

Initializes the native MapKit SDK. Call it once, before rendering any `YandexMapView` — a map view rendered before initialization stays empty and logs a warning (it does not crash), then recovers automatically once `initialize` resolves.

- **Optional** when a build-time `apiKey` is set on the config plugin: MapKit is already initialized at startup, so you can render `<YandexMapView />` without calling this at all.
- Idempotent: calling again with the same key resolves silently (including when that key came from the config plugin).
- Calling with a *different* key after successful initialization rejects with error code `ERR_YANDEX_MAPKIT_REINIT` (the native SDK takes its key once, before initialization).

### `setLocale(locale: string): Promise<void>` · `getLocale(): Promise<string | null>` · `resetLocale(): Promise<void>`

Get/set the map display language at runtime, as `language` or `language_REGION` (e.g. `"en_US"`, `"ru_RU"`, `"tr_TR"`). `getLocale()` resolves `null` when the map follows the device locale; `resetLocale()` returns to it.

> ⚠️ **SDK caveats** (MapKit's, not this library's): on **iOS** the locale only takes effect if set **once, before the first map is created**; on **Android** a change fully applies only after an app restart. For a language known at build time, prefer the config plugin's [`locale`](#config-plugin) option — it applies during startup and avoids the init-order trap entirely.

### `<YandexMapView />`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `cameraPosition` | `CameraPosition` | — | Declarative camera: changing the prop moves the native camera. Values equal to the current position (within 1e-6) are ignored, so echoing `onCameraPositionChanged` back does not loop. |
| `animated` | `boolean` | `true` | Animate declarative camera moves (0.3 s); instant when `false`. |
| `nightMode` | `boolean` | `false` | MapKit night colour scheme. |
| `scrollGesturesEnabled` | `boolean` | `true` | Allow panning the map by dragging. |
| `zoomGesturesEnabled` | `boolean` | `true` | Allow pinch / double-tap / two-finger-tap zoom. |
| `tiltGesturesEnabled` | `boolean` | `true` | Allow the two-finger vertical drag that tilts the camera. |
| `rotateGesturesEnabled` | `boolean` | `true` | Allow the two-finger twist that rotates the map. |
| `fastTapEnabled` | `boolean` | `true` | Report a tap immediately instead of waiting to see if it becomes a double-tap. |
| `interactiveDisabled` | `boolean` | `false` | When `true`, disables all four movement gestures at once — a shorthand that overrides the individual `*GesturesEnabled` props. Tap events (`onMapPress`/`onMapLongPress`) still fire. |
| `minZoom` | `number` | — (MapKit default) | Clamp the camera's minimum (most zoomed-out) zoom level. Applies to gestures and programmatic moves. Requested in [yamap#187](https://github.com/volga-volga/react-native-yamap/issues/187) — no other wrapper ships it. |
| `maxZoom` | `number` | — (MapKit default) | Clamp the camera's maximum (most zoomed-in) zoom level. |
| `mapType` | `'none' \| 'map' \| 'satellite' \| 'hybrid' \| 'vector'` | — (SDK default) | Base map layer. `'map'`, `'satellite'` and `'hybrid'` are raster; `'vector'` is the styleable vector scheme. Left unset, the map keeps MapKit's own default (vector). **`'satellite'` / `'hybrid'` need a key with satellite-imagery access enabled** — the prop still takes effect (the map leaves the road scheme and shows the empty tile grid), but no aerial tiles load on a free-tier MapKit Mobile SDK key; request imagery access for your key in the Yandex dashboard. |
| `mapStyle` | `string` | — | A [Yandex JSON map style](https://yandex.com/dev/mapkit/doc/en/android/generated/style) applied to the map. **Only affects the `'vector'` and `'hybrid'` layers** — leave `mapType` unset (the default is vector) or set `mapType='vector'`; it is a silent no-op on the raster `'map'` / `'satellite'` layers. Pass `''` to clear a previously applied style. Invalid JSON is ignored with a warning. |
| `logoPosition` | `{ horizontal: 'left' \| 'center' \| 'right'; vertical: 'top' \| 'bottom' }` | — | Corner the mandatory Yandex logo is aligned to. |
| `logoPadding` | `{ horizontal: number; vertical: number }` | — | Logo padding, in px, from the aligned edges (negatives are clamped to `0`). |
| `showUserPosition` | `boolean` | `false` | Show the device-location dot. Requires the app to hold location permission (see the `locationWhenInUsePermission` plugin option, or request it yourself). |
| `followUser` | `boolean` | `false` | Keep the camera centered on the user's location. Requires `showUserPosition`. |
| `userLocationIcon` | `ImageSourcePropType` | — | Custom icon for the user-location dot — used for both the resting pin and the heading arrow. `require('./me.png')` or `{ uri }`. Requires `showUserPosition`; unset keeps MapKit's default dot. |
| `userLocationIconScale` | `number` | `1` | Scale multiplier applied to `userLocationIcon`. |
| `userLocationAccuracyFillColor` | `ColorValue` | — | Fill colour of the accuracy circle around the dot. Unset keeps MapKit's default. |
| `userLocationAccuracyStrokeColor` | `ColorValue` | — | Stroke (border) colour of the accuracy circle. Unset keeps MapKit's default. |
| `userLocationAccuracyStrokeWidth` | `number` | — | Accuracy-circle stroke width, in points. |
| `trafficVisible` | `boolean` | `false` | Show the live traffic-jams layer. |
| `mapPadding` | `{ top?, right?, bottom?, left? }` (points) | — | Persistent inset around the map's logical viewport (the react-native-maps `mapPadding` convention). Shifts the optical center and the target of camera moves / gestures so content stays clear of a bottom sheet, header, or floating controls. Applied as MapKit's map-window focus rectangle. `fitMarkers` / `fitAllMarkers` fall back to it when their own `edgePadding` is omitted. |
| `style` | `StyleProp<ViewStyle>` | — | Standard React Native view styling. |

> For a non-interactive map (e.g. a static preview) set `interactiveDisabled` (shorthand for disabling all four movement gestures); toggle `rotateGesturesEnabled` / `tiltGesturesEnabled` off to keep the map flat and north-up.

Events:

| Event | `nativeEvent` payload | Fires |
| --- | --- | --- |
| `onMapReady` | `{}` | Once per view, when the native map has been created (after `initialize`). |
| `onCameraPositionChanged` | `CameraPositionChangeEvent` | While the camera moves; `reason` distinguishes user gestures from programmatic moves, `finished` marks the end of a movement. |
| `onMapPress` | `MapPressEvent` | On a single tap on blank map. |
| `onMapLongPress` | `MapPressEvent` | On a long press on the map. |
| `onPoiTap` | `PoiTapEvent` | On a tap on one of the map's own labelled objects (a POI icon, a toponym) — carries its `name`, `point`, and a `selection` token for `selectGeoObject()`. A POI tap fires `onPoiTap` and does **not** also fire `onMapPress` (the react-native-maps `onPoiClick` convention). **No other Yandex-maps RN wrapper exposes built-in POI taps** — theirs return bare coordinates only. |
| `onMapLoaded` | `MapLoadStatistics` | Once the map finishes loading — carries render stats (`renderObjectCount`, `tileMemoryUsage`, load timings). |
| `onTrafficChanged` | `TrafficChangeEvent` | The visible region's traffic score (`{ available, level? (0–10), color? ('red'/'yellow'/'green') }`) as it recomputes. Fires only while `trafficVisible`. No Yandex-maps RN wrapper surfaces it. |
| `onUserLocationChange` | `UserLocationChangeEvent` | The device's `{ point, accuracy }` whenever the user-location dot appears or moves. Requires `showUserPosition` + location permission. **No Yandex-maps RN wrapper surfaces the user's coordinates** — this answers the recurring ask ([yamap#295](https://github.com/volga-volga/react-native-yamap/issues/295)). |

### Types

```ts
type Point = { latitude: number; longitude: number };

type CameraPosition = {
  latitude: number;
  longitude: number;
  zoom: number;        // MapKit zoom, ~0..21
  azimuth?: number;    // degrees, default 0
  tilt?: number;       // degrees, default 0
};

type CameraPositionChangeEvent = {
  cameraPosition: Required<CameraPosition>; // azimuth/tilt always present in payloads
  reason: 'gestures' | 'application';
  finished: boolean;
};

type MapPressEvent = { point: Point };

type TrafficChangeEvent = {
  available: boolean;                      // false while loading / expired / unavailable
  level?: number;                          // congestion score 0–10 (higher = worse)
  color?: 'red' | 'yellow' | 'green';      // the traffic badge color
};

type UserLocationChangeEvent = {
  point: Point;      // the device's current coordinate
  accuracy: number;  // horizontal accuracy radius, in metres
};

// Opaque MapKit ids identifying a tapped built-in object, enough to (re)select it.
type GeoObjectSelection = {
  objectId: string;
  dataSourceName: string;
  layerId: string;
  groupId?: number;
};

type PoiTapEvent = {
  name?: string;               // the object's label, when present
  point?: Point;               // the object's coordinate, when available
  selection: GeoObjectSelection; // pass to mapRef.selectGeoObject() to highlight it
};

type MapLoadStatistics = {
  renderObjectCount: number;      // number of map objects rendered
  tileMemoryUsage: number;        // tile cache memory usage, in bytes
  curZoomModelsLoaded: number;    // load timings — SDK-native units, differ by platform (iOS seconds / Android integer)
  curZoomPlacemarksLoaded: number;
  curZoomLabelsLoaded: number;
  curZoomGeometryLoaded: number;
  delayedGeometryLoaded: number;
  fullyLoaded: number;
  fullyAppeared: number;
};
```

The raw native module is also exported as `ExpoYandexMapKitModule` as an escape hatch; its shape is not part of the stable API.

### Imperative methods

Call these through a ref (`const mapRef = useRef<YandexMapViewRef>(null)`). All return Promises and run on the UI thread:

| Method | Returns | Notes |
| --- | --- | --- |
| `setCenter(position, options?)` | `Promise<void>` | Move / animate the camera. `options.durationSeconds` (default `0.3`, `0` = instant) and `options.animation` (`'smooth' \| 'linear'`). Sets the full camera — omitting `azimuth`/`tilt` resets them to `0` (flat, north-up). No-op until the map is ready. |
| `setZoom(zoom, options?)` | `Promise<void>` | Animate the zoom, keeping the current center / azimuth / tilt. |
| `fitMarkers(points, options?)` | `Promise<void>` | Move the camera so every point is visible. A single point recenters at the current zoom. `options.edgePadding` (`{ top, right, bottom, left }`, in points) keeps the fit clear of overlays. |
| `fitAllMarkers(options?)` | `Promise<void>` | Like `fitMarkers` but for every mounted `<Marker>` — no need to pass the points. No-op when there are no markers. |
| `getCameraPosition()` | `Promise<CameraPosition \| null>` | Current camera; `null` until the map is ready. |
| `getVisibleRegion()` | `Promise<VisibleRegion \| null>` | The visible geographic quad (`topLeft` / `topRight` / `bottomLeft` / `bottomRight`). |
| `getScreenPoints(points)` | `Promise<(ScreenPoint \| null)[]>` | Project world coordinates to screen pixels; `null` per point that can't be projected (off-globe / behind the camera). |
| `getWorldPoints(points)` | `Promise<(Point \| null)[]>` | Project screen pixels back to world coordinates. |
| `takeSnapshot()` | `Promise<string \| null>` | Capture the rendered map as a base64 PNG **data URI** (`data:image/png;base64,…`), usable directly as `<Image source={{ uri }}>`. Call after `onMapLoaded`. `null` if not ready. Requested in [yamap#48](https://github.com/volga-volga/react-native-yamap/issues/48) — no wrapper ships it. |
| `selectGeoObject(selection)` | `Promise<void>` | Draw MapKit's selection highlight around a built-in POI / geo-object. Pass the `selection` carried by an `onPoiTap` event. No-op until the map is ready. |
| `deselectGeoObject()` | `Promise<void>` | Clear any selection highlight drawn by `selectGeoObject()`. |

```tsx
const mapRef = useRef<YandexMapViewRef>(null);
// ...
<YandexMapView ref={mapRef} style={StyleSheet.absoluteFill} cameraPosition={{ latitude: 41.31, longitude: 69.24, zoom: 12 }} />;

await mapRef.current?.setCenter({ latitude: 41.31, longitude: 69.24, zoom: 14 }, { durationSeconds: 0.4 });
const region = await mapRef.current?.getVisibleRegion();
const [screen] = await mapRef.current?.getScreenPoints([{ latitude: 41.31, longitude: 69.24 }]) ?? [];

// Tap a built-in POI → highlight it with MapKit's native selection:
<YandexMapView
  ref={mapRef}
  onPoiTap={({ nativeEvent }) => mapRef.current?.selectGeoObject(nativeEvent.selection)}
/>;
```

### `<Marker />`

Render markers as children of `YandexMapView`:

```tsx
import { YandexMapView, Marker } from 'expo-yandex-mapkit';

<YandexMapView style={StyleSheet.absoluteFill} cameraPosition={{ latitude: 41.31, longitude: 69.24, zoom: 12 }}>
  <Marker
    point={{ latitude: 41.31, longitude: 69.24 }}
    source={require('./assets/pin.png')}
    anchor={{ x: 0.5, y: 1 }}
    identifier="center"
    onPress={({ nativeEvent }) => console.log('tapped', nativeEvent.identifier)}
  />
</YandexMapView>;
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `point` | `Point` | — | Geographic position (required). |
| `source` | `ImageSourcePropType` | — | Icon image — `require('./pin.png')` or `{ uri }` (http, `data:`, `file:`, or a bundled asset). Omit to keep MapKit's default placemark (which is empty until an icon is set). |
| `scale` | `number` | `1` | Icon scale multiplier. |
| `anchor` | `{ x: number; y: number }` | icon default | Anchor point as `[0,1]` fractions of the icon; `{ x: 0.5, y: 1 }` pins the bottom-center. |
| `visible` | `boolean` | `true` | Show/hide the icon. |
| `zIndex` | `number` | `0` | Draw order among map objects. |
| `rotated` | `boolean` | `false` | When `true`, the icon rotates with the map's azimuth. |
| `handled` | `boolean` | `false` | When `true`, a tap is consumed and does **not** also fire the map's `onMapPress`. |
| `identifier` | `string` | — | Opaque id echoed back in `onPress` so one handler can tell markers apart. |
| `draggable` | `boolean` | `false` | Allow dragging the marker — long-press to pick it up, then drag. The drag is uncontrolled natively; read `onDragEnd`'s `point` and update your state (and the `point` prop) to persist it. Baseline in react-native-maps ([yamap#217](https://github.com/volga-volga/react-native-yamap/issues/217)) — no Yandex-maps RN wrapper offers it. |
| `onPress` | `(event) => void` | — | `event.nativeEvent` is `{ identifier?, point }`. |
| `onDragStart` / `onDrag` / `onDragEnd` | `(event) => void` | — | Fire while dragging a `draggable` marker. `event.nativeEvent` is `{ identifier?, point }` — the live drag point during `onDrag`, the resting position on start/end. |
| `children` | `ReactNode` | — | React content rendered as the marker's icon (a custom pin). Takes precedence over `source`. Rendered natively via MapKit's view provider (no fragile bitmap snapshotting). |
| `tracksViewChanges` | `boolean` | `true` | Whether to keep re-rendering the icon as the `children` change. Set `false` once the content has settled (e.g. a static bubble) so it's rendered once — a large perf win vs. re-rendering every frame. |
| `excludeFromCluster` | `boolean` | `false` | Only meaningful inside a `<Clusterer>`: when `true`, this marker is never merged into a cluster — it stays a standalone placemark at every zoom. |

**Custom (React-children) markers** — render any RN view as the pin:

```tsx
<Marker point={{ latitude: 41.31, longitude: 69.24 }} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
  <View style={{ backgroundColor: '#1e88e5', borderRadius: 14, paddingVertical: 4, paddingHorizontal: 10 }}>
    <Text style={{ color: '#fff', fontWeight: '700' }}>4.8★</Text>
  </View>
</Marker>
```

Imperative methods via a marker ref (`const ref = useRef<MarkerRef>(null)`):

| Method | Notes |
| --- | --- |
| `animatedMoveTo(point, durationMs)` | Linearly animate the marker to `point`. |
| `animatedRotateTo(angle, durationMs)` | Linearly animate the icon heading to `angle` degrees. |
| `animateAlong(points, durationMs)` | Animate the marker along a polyline (2+ points) at constant speed, facing each segment's heading (set `rotated` to see it turn) — courier / route tracking. [yamap#197](https://github.com/volga-volga/react-native-yamap/issues/197) et al.; no wrapper ships it. |

> Markers mounted before `initialize()` resolves attach automatically once the map is created — no ready-gating needed for the children.

### `<Polyline />`

Render a line as a child of `YandexMapView`:

```tsx
import { YandexMapView, Polyline } from 'expo-yandex-mapkit';

<YandexMapView style={StyleSheet.absoluteFill} cameraPosition={{ latitude: 41.31, longitude: 69.24, zoom: 12 }}>
  <Polyline
    points={[{ latitude: 41.31, longitude: 69.24 }, { latitude: 41.33, longitude: 69.28 }]}
    strokeColor="#1e88e5"
    strokeWidth={4}
    onPress={({ nativeEvent }) => console.log('line tapped at', nativeEvent.point)}
  />
</YandexMapView>;
```

| Prop | Type | Description |
| --- | --- | --- |
| `points` | `Point[]` | Line vertices (2+). Required. |
| `strokeColor` | `ColorValue` | Line color. |
| `strokeWidth` | `number` | Line width (points). |
| `outlineColor` / `outlineWidth` | `ColorValue` / `number` | Border drawn under the stroke. |
| `dashLength` / `gapLength` / `dashOffset` | `number` | Dash pattern (points). |
| `zIndex` | `number` | Draw order among map objects. |
| `handled` | `boolean` | Consume the tap so it does not also fire the map's `onMapPress`. |
| `onPress` | `(event) => void` | `event.nativeEvent` is `{ point }`. |

### `<Polygon />` and `<Circle />`

Same idea, as children of the map:

```tsx
import { YandexMapView, Polygon, Circle } from 'expo-yandex-mapkit';

<YandexMapView style={StyleSheet.absoluteFill} cameraPosition={{ latitude: 41.31, longitude: 69.24, zoom: 12 }}>
  <Polygon
    points={[/* outer ring, 3+ */]}
    innerRings={[[/* optional holes */]]}
    fillColor="rgba(30,136,229,0.3)"
    strokeColor="#1e88e5"
    strokeWidth={2}
  />
  <Circle center={{ latitude: 41.31, longitude: 69.24 }} radius={500} fillColor="rgba(244,67,54,0.2)" strokeColor="#f44336" />
</YandexMapView>;
```

- **`<Polygon>`**: `points` (outer ring, 3+), `innerRings?` (holes), `fillColor`, `strokeColor`, `strokeWidth`, `zIndex`, `onPress`, `handled`.
- **`<Circle>`**: `center`, `radius` (metres), `fillColor`, `strokeColor`, `strokeWidth`, `zIndex`, `onPress`, `handled`.

### `<Route />`

Draws a `Route` (from `findRoutes`) as colored polylines — one per section, by leg type (driving / walking / transit), walking legs dashed. Both Yandex-maps RN wrappers return route *data* and leave drawing to the app; this renders it out of the box:

```tsx
import { YandexMapView, Route, findDrivingRoutes } from 'expo-yandex-mapkit';

const [route] = await findDrivingRoutes([a, b]);
// ...
<YandexMapView style={StyleSheet.absoluteFill} cameraPosition={{ latitude: 41.31, longitude: 69.24, zoom: 11 }}>
  {route && <Route route={route} strokeWidth={6} />}
</YandexMapView>;
```

Props: `route`, `strokeWidth`, `drivingColor` / `walkColor` / `transitColor`, `outlineColor`, `zIndex`, `onPress`. Falls back to the route's whole `points` geometry when it has no `sections`.

### Geometry helpers

Pure-JS helpers (no map instance, work on web too):

```tsx
import { distanceBetween, pathLength, boundingBox } from 'expo-yandex-mapkit';

distanceBetween({ latitude: 41.31, longitude: 69.24 }, { latitude: 55.75, longitude: 37.62 }); // metres (haversine)
pathLength([p1, p2, p3]); // total polyline length in metres
boundingBox([p1, p2, p3]); // { southWest, northEast } | null — feed to fitMarkers / a search window
```

### `<Geojson />`

Render a [GeoJSON](https://datatracker.ietf.org/doc/html/rfc7946) object directly — pure-JS sugar that expands into `<Marker>` / `<Polyline>` / `<Polygon>` (the react-native-maps convention; no other Yandex-maps RN wrapper has it):

```tsx
import { YandexMapView, Geojson } from 'expo-yandex-mapkit';

<YandexMapView style={StyleSheet.absoluteFill} cameraPosition={{ latitude: 41.31, longitude: 69.24, zoom: 11 }}>
  <Geojson
    geojson={featureCollection}
    strokeColor="#1e88e5"
    strokeWidth={3}
    fillColor="rgba(30,136,229,0.2)"
    markerSource={require('./pin.png')}
    onPress={(feature) => console.log('tapped', feature.properties)}
  />
</YandexMapView>;
```

Accepts a `FeatureCollection`, `Feature`, or bare `Geometry`. `Point`/`MultiPoint` → markers, `LineString`/`MultiLineString` → polylines, `Polygon`/`MultiPolygon` → polygons (first ring outer, the rest holes); `GeometryCollection` expands recursively. Props: `geojson`, `markerSource` / `markerScale`, `strokeColor` / `strokeWidth`, `fillColor`, `zIndex`, `onPress(feature)`. GeoJSON `[lng, lat]` is converted to `{ latitude, longitude }` for you.

### `<Clusterer />`

Group `<Marker>` children into clusters. Wrap the markers to cluster in a `<Clusterer>` — each marker keeps all its usual features (image or React-children icon, `onPress`, `identifier`):

```tsx
import { YandexMapView, Clusterer, Marker } from 'expo-yandex-mapkit';

<YandexMapView style={StyleSheet.absoluteFill} cameraPosition={{ latitude: 41.31, longitude: 69.24, zoom: 10 }}>
  <Clusterer
    clusterRadius={60}
    minZoom={12}
    clusterColor="#2E7D32"
    onClusterPress={({ nativeEvent }) => console.log(`cluster of ${nativeEvent.size}`)}
  >
    {places.map((p) => (
      <Marker key={p.id} point={p.point} identifier={p.id} onPress={onMarkerPress} />
    ))}
  </Clusterer>
</YandexMapView>;
```

There is no separate "clustered marker" API and no `renderMarker` render-prop — the same `<Marker>` you use elsewhere is the render-prop. Tapping a cluster fits the camera to its markers (`fitClusterOnPress`, on by default) and fires `onClusterPress`. Individual `<Marker>` `onPress` still fires once a marker is shown un-clustered (zoomed in past `minZoom`). Only `<Marker>` children are clustered; shapes belong directly under the map.

| Prop | Type | Description |
| --- | --- | --- |
| `clusterRadius` | `number` | Merge distance in points/dp — larger groups more aggressively. Default `60`. |
| `minZoom` | `number` | Clustering applies at zoom ≤ this; zooming in past it splits clusters apart. Default `12`. |
| `clusterColor` | `ColorValue` | Cluster badge fill color. Default `#3478F6`. |
| `clusterTextColor` | `ColorValue` | Cluster badge count-text color. Default white. |
| `clusterTextSize` | `number` | Cluster badge count-text size (points). Default `13`. |
| `clusterSize` | `number` | Cluster badge diameter (points); grows for 3+ digit counts. Default `36`. Ignored when `clusterIcon` is set. |
| `clusterIcon` | `ImageSourcePropType` | Custom badge image — `require('./cluster.png')` or `{ uri }`. Replaces the drawn color disc; the count is still drawn on top (honoring `clusterTextColor`/`clusterTextSize`/`clusterTextOffset`), at the image's own size. Unset draws the default disc. |
| `clusterTextOffset` | `{ x: number; y: number }` | Nudge the count text within the badge, in points (positive `x` → right, `y` → down). Default centered. Applies to both the disc and a `clusterIcon` badge. |
| `fitClusterOnPress` | `boolean` | Animate the camera to fit a tapped cluster's markers. Default `true`. |
| `onClusterPress` | `(event) => void` | `event.nativeEvent` is `{ size, point }`. |

Keep a marker out of clustering with the `<Marker>` `excludeFromCluster` prop — it stays a standalone placemark at every zoom (handy for a "you are here" pin among clustered data points).

> **On `onClusterPlacemarkPress` and imperative `appendClusterMarkers` / `clearClusterMarkers`** (both present in react-native-yamap-plus): this library's declarative design covers them without extra API. A clustered marker's own `onPress` already fires when it's shown un-clustered, so there's no separate placemark-press callback to wire up; and you add/remove/replace clustered markers by rendering `<Marker>` children from state (`setMarkers(...)`), which is the batch API — no imperative `append`/`clear` calls to keep in sync.

### `suggest()` — search-as-you-type

> **Requires the MapKit `full` flavor** — set `flavor: 'full'` in the [config plugin](#2-add-the-config-plugin). On `lite` this rejects with a clear message.

```tsx
import { suggest, resetSuggest } from 'expo-yandex-mapkit';

const items = await suggest('coffee', {
  userPosition: { latitude: 41.31, longitude: 69.24 }, // bias toward the user
  types: ['biz', 'geo'], // organizations + places (also 'transit')
});
// items: { title, subtitle?, searchText, uri?, center?, distance? }[]
// Call resetSuggest() to cancel an in-flight request (e.g. on unmount).
```

Each result carries its `center` coordinate **directly** (read natively) whenever MapKit provides one — unlike the lineage this parity-targets, which re-parsed the `uri` in JS and [dropped coordinates](https://github.com/Qudaeo/react-native-yamap-plus/issues/27) for org/opaque URIs. When `center` is absent, use `searchText` (run a full search) or `uri`. Requires MapKit to be initialized (via `initialize()` or a build-time key).

| Option | Type | Description |
| --- | --- | --- |
| `userPosition` | `Point` | Bias results toward this location. |
| `boundingBox` | `{ southWest: Point; northEast: Point }` | Bias/restrict results to this box. |
| `suggestWords` | `boolean` | Also suggest query-word completions. Default `true`. |
| `types` | `('geo' \| 'biz' \| 'transit')[]` | Which result kinds to return. Default all three. |

### `searchText()` / `searchPoint()` — search & geocoding

> **Requires the MapKit `full` flavor** (rejects on `lite`).

```tsx
import { searchText, searchPoint, geocodeAddress, geocodePoint } from 'expo-yandex-mapkit';

const places = await searchText('coffee', {
  boundingBox: { southWest: { latitude: 41.28, longitude: 69.18 }, northEast: { latitude: 41.36, longitude: 69.32 } },
  searchTypes: ['biz'],
});
const here = await searchPoint({ latitude: 41.31, longitude: 69.24 }); // reverse geocoding
// results: { name?, description?, point?, formattedAddress?, addressComponents? }[]
```

- `searchText(query, options?)` — full-text search near a window (`boundingBox`/`userPosition`, else world-wide).
- `searchPoint(point, options?)` — reverse geocoding (objects at a coordinate; `options.zoom` sets detail).
- `geocodeAddress(address, options?)` — `searchText` restricted to toponyms (`geo`); `geocodePoint(point, options?)` — alias for `searchPoint`.
- `resolveURI(uri, options?)` — resolve a `ymapsbm1://…` object URI (e.g. a `SuggestItem.uri`) to full results; the documented way to get coordinates for a suggestion that had no `center`.

A toponym result also carries `addressComponents` — the structured breakdown, each `{ name, kinds }` where `kinds` are snake_case (`country`, `province`, `locality`, `district`, `street`, `house`, `metro_station`, …). An organization result requested with the `'rating'` snippet carries `rating` (0–5) + `ratingsCount`. Options: `userPosition`, `boundingBox`, `searchTypes` (`'geo'` toponyms / `'biz'` organizations, default `['geo']`), `resultPageSize`, `zoom`, `disableSpellingCorrection`, and `snippets` (`'rating'` / `'photos'` / `'panoramas'`). Requires MapKit to be initialized.

### `findRoutes()` — routing

> **Requires the MapKit `full` flavor** (rejects on `lite`).

```tsx
import { findRoutes, findDrivingRoutes } from 'expo-yandex-mapkit';

const routes = await findRoutes(
  [{ latitude: 41.31, longitude: 69.24 }, { latitude: 41.33, longitude: 69.29 }],
  'masstransit', // or 'driving' | 'pedestrian'
);
// routes[0]: { time?, timeWithTraffic?, distance?, walkingDistance?, transfersCount?, points }
// Draw it: <Polyline points={routes[0].points} />
```

- `findRoutes(points, mode)` — 2+ waypoints, `mode` = `'driving'` | `'masstransit'` | `'pedestrian'`; resolves best-route-first.
- `findDrivingRoutes` / `findMasstransitRoutes` / `findPedestrianRoutes` — convenience wrappers.

Each `Route` carries a summary (`time`; `timeWithTraffic` + `distance` for driving; `walkingDistance` + `transfersCount` for masstransit), its `points` geometry, and `sections` — the route split into legs. Each `RouteSection` is `{ type, time?, points, transports? }`: `type` is `'car'`, `'walk'`, `'waiting'`, or a transit vehicle type (`'bus'`, `'underground'`, …), `transports` maps each vehicle type to its line names, and `points` is that leg's own polyline fragment. So a masstransit route reads as "walk → bus 42 → transfer → metro", each leg drawable on its own. Requires MapKit to be initialized.

## lite vs full

Yandex ships MapKit in two flavors. This library defaults to `lite`; select `full` via the [config plugin](#2-add-the-config-plugin) when you need **search, suggest, geocoding, or routing** — all of which are fully implemented and require the `full` artifact. On `lite`, those functions reject with a clear "requires the full flavor" message, so a lite app never crashes on them. `full` pulls a larger SDK (bigger binary, longer first build), so stay on `lite` if you only render maps / markers / shapes / clustering / user location / traffic.

| Capability | `lite` | `full` |
| --- | --- | --- |
| Map rendering, markers, polylines/polygons | ✓ | ✓ |
| Clustering, traffic layer, user location | ✓ | ✓ |
| Routing | — | ✓ |
| Search + suggest | — | ✓ |
| Geocoding | — | ✓ |
| Panoramas | — | ✓ |

Offline maps exist in both flavors but require a paid MapKit license. For usage limits and pricing, refer to [Yandex's terms and conditions](https://yandex.com/maps-api) — the numbers change and depend on your plan, so this README deliberately does not state them.

## Troubleshooting & FAQ

**The map is blank.**
The two usual causes: `initialize(apiKey)` was never called (or rejected — attach a `.catch` and look at the message) and no build-time `apiKey` was set on the config plugin, or the API key is invalid / not enabled for the MapKit Mobile SDK. Check the native logs for MapKit errors: `adb logcat | grep -i -E 'mapkit|yandex'` on Android, the Xcode console on iOS. A view mounted before `initialize` resolves recovers automatically once it does.

**"…does not run in Expo Go" / crashes in Expo Go.**
Expected — native modules cannot load in Expo Go. Use `npx expo run:android|ios` or an EAS development build. A DOM-component fallback for Expo Go is on the roadmap (v3).

**Android build fails with a manifest-merger / minSdkVersion error.**
MapKit requires Android API 26. The config plugin raises `android.minSdkVersion` automatically — make sure `expo-yandex-mapkit` is actually listed in `app.json` → `plugins` and re-run `npx expo prebuild`.

**The map renders black or empty in the iOS Simulator.**
MapKit's GPU rendering has known Simulator quirks (reported across the Yandex-wrapper ecosystem). Try a physical device before assuming a configuration problem.

**Which MapKit version should I pin?**
By default you get this release's tested version (4.42.0). Yandex recommends staying on the latest MapKit; override via the plugin's `version` option if you need a newer one before we bump the default.

**Can I change the API key at runtime?**
No — the native SDK accepts its key once. A second `initialize` with a different key rejects with `ERR_YANDEX_MAPKIT_REINIT`.

**Does it work on web?**
Not yet: the web build warns once and renders nothing (deliberately, instead of crashing). A `ymaps3`-based DOM component is planned (v3).

## Migrating from react-native-yamap

Many prospective users come from `react-native-yamap` (no npm release since 2024). Honestly: v0's surface is far smaller — map view, camera, press events, night mode — so there is no complete migration path yet. A proper migration guide with a prop-mapping table is planned once markers and shapes land; where sensible, prop names will mirror `react-native-yamap`'s to keep the move mechanical.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) for the development setup (the example app is CNG: `npx expo prebuild` generates its native projects and exercises the config plugin), native-code gotchas (MapKit's weak-listener contract, the three synced version pins), and commit conventions.

**Maintainers / releasing:** the npm publishing playbook — one-time org + trusted-publisher setup, then `npm version && git push --follow-tags` driving [`release.yaml`](./.github/workflows/release.yaml) with provenance — lives in [CONTRIBUTING.md → Releasing](./CONTRIBUTING.md#releasing).

## Disclaimer

This project uses Yandex MapKit, which belongs to Yandex. Refer to their [terms of use](https://yandex.com/maps-api). Not affiliated with or endorsed by Yandex.

Not affiliated with the `expo-yandex-maps` npm package (unmaintained since 2023).

## License

[MIT](./LICENSE)
