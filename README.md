# expo-yandex-mapkit

**English** | [Русский](./README.ru.md)

Yandex Maps (MapKit) for Expo — built on the Expo Modules API, configured by a config plugin, New Architecture ready.

[![npm version](https://img.shields.io/npm/v/expo-yandex-mapkit.svg)](https://www.npmjs.com/package/expo-yandex-mapkit)
[![license](https://img.shields.io/npm/l/expo-yandex-mapkit.svg)](./LICENSE)
[![CI](https://github.com/softwhere-uz/expo-yandex-mapkit/actions/workflows/ci.yaml/badge.svg)](https://github.com/softwhere-uz/expo-yandex-mapkit/actions/workflows/ci.yaml)

## Features

- 🗺️ Native Yandex MapKit map view on Android and iOS (Fabric / New Architecture)
- 🎥 Declarative camera with optional animation (`cameraPosition` + `animated`)
- 👆 Camera, press, and long-press events with identical payloads on both platforms
- 🌙 Night mode
- 🔑 Runtime API key via `initialize(apiKey)` — **zero** `AndroidManifest.xml` / `AppDelegate` edits
- 🔧 Config plugin: MapKit version and `lite`/`full` flavor (per-platform overrides), Android minSdk floor — `npx expo prebuild` is the whole setup
- 📦 Also installable as the scoped alias [`@softwhere-uz/expo-yandex-mapkit`](https://www.npmjs.com/package/@softwhere-uz/expo-yandex-mapkit)
- 🌍 Documentation in [English](./README.md) and [Russian](./README.ru.md)

Planned: markers (including React-children icons), polylines/polygons/circles, clustering, user location, traffic, JSON styling, search/geocoding/routing (`full` flavor), [Mappable](https://github.com/mappable-world) dual-brand support, and a DOM-component fallback for Expo Go and web. See the roadmap below.

## Status

**Early development (v0.0.x).** What ships today: a native `YandexMapView` for Android and iOS with declarative camera control, camera/press events and night mode, a JS-side `initialize(apiKey)` (no native file edits), and a config plugin that selects the MapKit version and flavor and enforces Android minSdk 26. Expect breaking changes between 0.0.x releases.

| Phase | Scope | Status |
| --- | --- | --- |
| v0 | MapView, camera control + events, press events, night mode, markers (incl. React-children icons) | In progress — everything except markers is shipped |
| v1 | Polylines, polygons, circles, clustering, user-location layer, traffic toggle, JSON map styling | Planned |
| v2 | Full-flavor features: search + suggest, geocoding, routing | Planned |
| v3 | Mappable (mappable.world) dual-brand support; `expo-yandex-mapkit-dom` — a DOM-component fallback so a map can render in Expo Go and on web | Planned |

## Why

- Yandex does not officially support React Native (Flutter gets a first-party plugin; React Native does not).
- Expo's own [`expo-maps`](https://docs.expo.dev/versions/latest/sdk/maps/) supports Apple Maps and Google Maps only, with no mechanism for third-party providers.
- The existing community wrappers each fall short in some way — no longer maintained, source unavailable, or documented in a single language. All of them did valuable groundwork; none covers the whole intersection.

This project aims to be the maintained, open-source option documented in both English and Russian: Expo Modules API, a real config plugin, both React Native architectures, and a current MapKit pin.

## Alternatives

An honest comparison, as of July 2026. If you need markers, routing, or clustering **today**, the incumbents below are more feature-complete than this library's v0 — the trade-offs are in the other rows.

| | `expo-yandex-mapkit` (this) | [`react-native-yamap-plus`](https://github.com/Qudaeo/react-native-yamap-plus) | `@yoyomobility/expo-yandex-maps` | [`react-native-yamap`](https://github.com/volga-volga/react-native-yamap) |
| --- | --- | --- | --- | --- |
| Actively maintained | ✓ | ✓ | ✓ | — (no release since Nov 2024) |
| Open source | ✓ MIT | ✓ MIT | — (source repo unavailable) | source public, no license declared |
| Expo Modules API | ✓ | — (TurboModules) | ✓ | — (legacy bridge) |
| Expo config plugin | ✓ (version, flavor, minSdk) | ✓ (flavor) | — (manual setup) | — (manual native edits) |
| New Architecture | ✓ | ✓ (v5+) | ✓ | — |
| Documentation | English + Russian | Russian | partial English | partial |
| Extra peer dependencies | none | none | `react-native-reanimated ^4` | none |
| Feature depth today | map, camera, events, night mode | deep (markers, shapes, routing…) | deep (clustering, routing…) | deepest, but broken on current Expo SDKs |

## Compatibility

| | Requirement |
| --- | --- |
| Expo SDK | Developed and tested against **SDK 57** (RN 0.86, New Architecture). Older SDKs are untested. |
| Android | minSdk **26** (Android 8.0) — enforced by the config plugin. |
| iOS | iOS **16.4+** (the SDK 57 default deployment target). CocoaPods only — MapKit ships no SPM package. |
| MapKit | Defaults to **4.42.0**; override via the [config plugin](#2-add-the-config-plugin). Yandex recommends staying current. |
| Expo Go | Not supported (native code) — use a [development build](https://docs.expo.dev/develop/development-builds/introduction/). |
| Bare React Native | Supported via Expo Modules — see [Bare React Native](#bare-react-native). |

## Installation

```sh
npx expo install expo-yandex-mapkit
```

Prefer scoped installs? `@softwhere-uz/expo-yandex-mapkit` is the official alias — it re-exports this package (including the config plugin) and tracks it automatically.

### 1. Get an API key

Create an API key for the **MapKit Mobile SDK** in the [Yandex Developer Dashboard](https://developer.tech.yandex.ru/services/) (see the [MapKit documentation](https://yandex.com/dev/mapkit/doc/en/)). The key is supplied at runtime via [`initialize`](#initializeapikey-string-promisevoid) — no `AndroidManifest.xml` or `AppDelegate` edits are needed.

### 2. Add the config plugin

In `app.json` / `app.config.js`:

```json
{
  "expo": {
    "plugins": [["expo-yandex-mapkit", { "flavor": "lite", "version": "4.42.0" }]]
  }
}
```

All options are optional:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `version` | `string` | `"4.42.0"` | Native MapKit SDK version (`x.y.z`). |
| `flavor` | `"lite" \| "full"` | `"lite"` | MapKit flavor — see [lite vs full](#lite-vs-full). |
| `android` | `{ version?, flavor? }` | — | Android-only overrides; take precedence over the top-level values. |
| `ios` | `{ version?, flavor? }` | — | iOS-only overrides; take precedence over the top-level values. |

The plugin also raises `android.minSdkVersion` to 26 if it is missing or lower — MapKit requires Android API 26. It never lowers an existing higher value.

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

For React Native **0.86**, `install-expo-modules` does not support your RN version yet (as of July 2026 it exits with "Unable to find compatible Expo SDK version") — follow Expo's [manual installation steps](https://docs.expo.dev/bare/installing-expo-modules/) instead, then `npm install expo@^57.0.0`. Keep the pairing exact: SDK 57 ↔ RN 0.86, SDK 56 ↔ RN 0.85 — do not mix.

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

The full version (night-mode toggle included) lives in [`example/`](./example).

## API reference

### `initialize(apiKey: string): Promise<void>`

Initializes the native MapKit SDK. Call it once, before rendering any `YandexMapView` — a map view rendered before initialization stays empty and logs a warning (it does not crash), then recovers automatically once `initialize` resolves.

- Idempotent: calling again with the same key resolves silently.
- Calling with a *different* key after successful initialization rejects with error code `ERR_YANDEX_MAPKIT_REINIT` (the native SDK takes its key once, before initialization).

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
| `mapType` | `'none' \| 'map' \| 'satellite' \| 'hybrid' \| 'vector'` | — (SDK default) | Base map layer. `'map'`, `'satellite'` and `'hybrid'` are raster; `'vector'` is the styleable vector scheme. Left unset, the map keeps MapKit's own default (vector). `'satellite'` / `'hybrid'` may require a Yandex-app API key. |
| `mapStyle` | `string` | — | A [Yandex JSON map style](https://yandex.com/dev/mapkit/doc/en/android/generated/style) applied to the map. **Only affects the `'vector'` and `'hybrid'` layers** — leave `mapType` unset (the default is vector) or set `mapType='vector'`; it is a silent no-op on the raster `'map'` / `'satellite'` layers. Pass `''` to clear a previously applied style. Invalid JSON is ignored with a warning. |
| `logoPosition` | `{ horizontal: 'left' \| 'center' \| 'right'; vertical: 'top' \| 'bottom' }` | — | Corner the mandatory Yandex logo is aligned to. |
| `logoPadding` | `{ horizontal: number; vertical: number }` | — | Logo padding, in px, from the aligned edges (negatives are clamped to `0`). |
| `style` | `StyleProp<ViewStyle>` | — | Standard React Native view styling. |

> For a non-interactive map (e.g. a static preview) set `interactiveDisabled` (shorthand for disabling all four movement gestures); toggle `rotateGesturesEnabled` / `tiltGesturesEnabled` off to keep the map flat and north-up.

Events:

| Event | `nativeEvent` payload | Fires |
| --- | --- | --- |
| `onMapReady` | `{}` | Once per view, when the native map has been created (after `initialize`). |
| `onCameraPositionChanged` | `CameraPositionChangeEvent` | While the camera moves; `reason` distinguishes user gestures from programmatic moves, `finished` marks the end of a movement. |
| `onMapPress` | `MapPressEvent` | On a single tap on the map. |
| `onMapLongPress` | `MapPressEvent` | On a long press on the map. |

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
```

The raw native module is also exported as `ExpoYandexMapKitModule` as an escape hatch; its shape is not part of the stable API.

### Imperative methods

Call these through a ref (`const mapRef = useRef<YandexMapViewRef>(null)`). All return Promises and run on the UI thread:

| Method | Returns | Notes |
| --- | --- | --- |
| `setCenter(position, options?)` | `Promise<void>` | Move / animate the camera. `options.durationSeconds` (default `0.3`, `0` = instant) and `options.animation` (`'smooth' \| 'linear'`). No-op until the map is ready. |
| `getCameraPosition()` | `Promise<CameraPosition \| null>` | Current camera; `null` until the map is ready. |
| `getVisibleRegion()` | `Promise<VisibleRegion \| null>` | The visible geographic quad (`topLeft` / `topRight` / `bottomLeft` / `bottomRight`). |
| `getScreenPoints(points)` | `Promise<(ScreenPoint \| null)[]>` | Project world coordinates to screen pixels; `null` per point that can't be projected (off-globe / behind the camera). |
| `getWorldPoints(points)` | `Promise<(Point \| null)[]>` | Project screen pixels back to world coordinates. |

```tsx
const mapRef = useRef<YandexMapViewRef>(null);
// ...
<YandexMapView ref={mapRef} style={StyleSheet.absoluteFill} cameraPosition={{ latitude: 41.31, longitude: 69.24, zoom: 12 }} />;

await mapRef.current?.setCenter({ latitude: 41.31, longitude: 69.24, zoom: 14 }, { durationSeconds: 0.4 });
const region = await mapRef.current?.getVisibleRegion();
const [screen] = await mapRef.current?.getScreenPoints([{ latitude: 41.31, longitude: 69.24 }]) ?? [];
```

## lite vs full

Yandex ships MapKit in two flavors. This library defaults to `lite`; select `full` via the [config plugin](#2-add-the-config-plugin) when you need its features (the library itself will start exposing them in v2).

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
The two usual causes: `initialize(apiKey)` was never called (or rejected — attach a `.catch` and look at the message), or the API key is invalid / not enabled for the MapKit Mobile SDK. Check the native logs for MapKit errors: `adb logcat | grep -i -E 'mapkit|yandex'` on Android, the Xcode console on iOS. A view mounted before `initialize` resolves recovers automatically once it does.

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
