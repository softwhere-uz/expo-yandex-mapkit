# expo-yandex-mapkit example

A minimal app exercising the library: full-screen map centred on Tashkent, all four events logged to the console, and a night-mode toggle.

## Prerequisites

- A Yandex MapKit API key for the **MapKit Mobile SDK** — see the [installation section](../README.md#installation) of the main README.
- Android SDK and/or Xcode set up for local builds.

## Run it

1. Provide the API key via an environment variable (or put the line in `example/.env`):

   ```sh
   export EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY=your-key-here
   ```

2. Generate the native projects (`example/android` and `example/ios` are gitignored — this app uses [CNG](https://docs.expo.dev/workflow/continuous-native-generation/)):

   ```sh
   npx expo prebuild
   ```

3. Build and run:

   ```sh
   npx expo run:android
   # or
   npx expo run:ios
   ```

> **Note:** Expo Go cannot run native MapKit — this example must be built with `expo run:*` (or as a development build). Without a valid API key the map stays empty.
