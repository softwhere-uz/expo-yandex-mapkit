# expo-yandex-mapkit

Yandex Maps (MapKit) for Expo — built on the Expo Modules API, configured by a config plugin, New Architecture ready.

[![npm version](https://img.shields.io/npm/v/expo-yandex-mapkit.svg)](https://www.npmjs.com/package/expo-yandex-mapkit)
[![license](https://img.shields.io/npm/l/expo-yandex-mapkit.svg)](./LICENSE)

## Status

**Early development (v0.0.x).** What ships today: a native `YandexMapView` for Android and iOS with declarative camera control, camera/press events and night mode, a JS-side `initialize(apiKey)` (no native file edits), and a config plugin that selects the MapKit version and flavor and enforces Android minSdk 26. Expect breaking changes between 0.0.x releases.

Roadmap:

| Phase | Scope | Status |
| --- | --- | --- |
| v0 | MapView, camera control + events, press events, night mode, markers (incl. React-children icons) | In progress — everything except markers is shipped |
| v1 | Polylines, polygons, circles, clustering, user-location layer, traffic toggle, JSON map styling | Planned |
| v2 | Full-flavor features: search + suggest, geocoding, routing | Planned |
| v3 | Mappable (mappable.world) dual-brand support; `expo-yandex-mapkit-dom` — a DOM-component fallback so a map can render in Expo Go and on web | Planned |

## Why

- Yandex does not officially support React Native (Flutter gets a first-party plugin; React Native does not).
- Expo's own [`expo-maps`](https://docs.expo.dev/versions/latest/sdk/maps/) supports Apple Maps and Google Maps only, with no mechanism for third-party providers.
- The existing community wrappers each fall short in some way — no longer maintained, source unavailable, or documented only in Russian. All of them did valuable groundwork; none covers the whole intersection.

This project aims to be the maintained, open-source, English-documented option: Expo Modules API, a real config plugin, both React Native architectures, and a current MapKit pin.

## Installation

```sh
npx expo install expo-yandex-mapkit
```

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

Initializes the native MapKit SDK. Call it once, before rendering any `YandexMapView` — a map view rendered before initialization stays empty and logs a warning (it does not crash).

- Idempotent: calling again with the same key resolves silently.
- Calling with a *different* key after successful initialization rejects with error code `ERR_YANDEX_MAPKIT_REINIT` (the native SDK takes its key once, before initialization).

### `<YandexMapView />`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `cameraPosition` | `CameraPosition` | — | Declarative camera: changing the prop moves the native camera. Values equal to the current position (within 1e-6) are ignored, so echoing `onCameraPositionChanged` back does not loop. |
| `animated` | `boolean` | `true` | Animate declarative camera moves (0.3 s); instant when `false`. |
| `nightMode` | `boolean` | `false` | MapKit night colour scheme. |
| `style` | `StyleProp<ViewStyle>` | — | Standard React Native view styling. |

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

## Migrating from react-native-yamap

Many prospective users come from `react-native-yamap` (no npm release since 2024). Honestly: v0's surface is far smaller — map view, camera, press events, night mode — so there is no complete migration path yet. A proper migration guide with a prop-mapping table is planned once markers and shapes land; where sensible, prop names will mirror `react-native-yamap`'s to keep the move mechanical.

## Disclaimer

This project uses Yandex MapKit, which belongs to Yandex. Refer to their [terms of use](https://yandex.com/maps-api). Not affiliated with or endorsed by Yandex.

Not affiliated with the `expo-yandex-maps` npm package (unmaintained since 2023).

## License

[MIT](./LICENSE)
