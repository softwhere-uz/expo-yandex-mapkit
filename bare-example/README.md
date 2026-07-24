# bare-example

A **bare React Native 0.86** app (community template, no `expo prebuild`) with Expo modules
wired **manually** — the exact end state described in the main README's
[Bare React Native](../README.md#bare-react-native) section — and `expo-yandex-mapkit`
consumed from the packed npm tarball.

It exists for two reasons:

1. **Reference**: every edit the setup guide describes can be read here as real code
   (`android/settings.gradle`, `android/build.gradle`, `MainApplication.kt`, `MainActivity.kt`,
   `ios/Podfile`, `AppDelegate.swift`, `ios/Podfile.properties.json`, `gradle.properties`).
2. **CI fixture**: the `bare-android` / `bare-ios` jobs in `.github/workflows/ci.yaml` pack the
   library, install the tarball here (`npm install --no-save ../expo-yandex-mapkit-*.tgz`), and
   build — so bare-RN support cannot silently regress.

To run it yourself: `npm ci`, install the packed library as above (or `npm i expo-yandex-mapkit`),
then `npx react-native run-android` / `run-ios` with your MapKit API key in `App.tsx`.
