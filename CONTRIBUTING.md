# Contributing

Thanks for helping build the Yandex MapKit binding the Expo ecosystem is missing.

## Development setup

```sh
git clone https://github.com/softwhere-uz/expo-yandex-mapkit.git
cd expo-yandex-mapkit
npm install                 # also builds src/ and plugin/ via the prepare script
cd example && npm install
```

The example app is [CNG](https://docs.expo.dev/workflow/continuous-native-generation/) — its
`android/` and `ios/` directories are gitignored and generated on demand (this is deliberate:
running prebuild is what exercises the config plugin):

```sh
cd example
npx expo prebuild
EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY=<your-key> npx expo run:android   # or run:ios (macOS)
```

### Project layout

```
src/                 TypeScript public API (+ .web.* stubs)
android/ ios/        Native bindings (Expo Modules API, Kotlin / Swift)
plugin/src/          Config plugin (compiled to plugin/build, loaded via app.plugin.js)
example/             CNG example app — doubles as the smoke test
alias/               @softwhere-uz/expo-yandex-mapkit scoped alias (no native code)
```

### Everyday commands

```sh
npm run build            # tsc for src/ (watch mode on a TTY; CI=1 for one-shot)
npm run build plugin     # tsc --build plugin
npm run lint             # eslint src/
npm run open:android     # open example/android in Android Studio (prebuild first)
npm run open:ios         # open the example iOS workspace in Xcode (prebuild first)
```

A fast compile check of the Android native code without a device:

```sh
cd example/android && ./gradlew :expo-yandex-mapkit:compileDebugKotlin
```

### Things to know before touching native code

- **MapKit holds weak references to listeners.** Every listener must be strongly retained by the
  view. On Android (MapKit ≥ 4.41) `add*Listener` takes an explicit `java.lang.ref.WeakReference`,
  so the compiler enforces awareness; on iOS it is an invisible runtime trap — an inline closure
  will be silently collected.
- The default MapKit version/flavor is pinned in **three places that must stay in sync**:
  `plugin/src/index.ts`, `android/build.gradle`, `ios/ExpoYandexMapKit.podspec`.
- Event names, prop names, and payload shapes must match **letter-for-letter** across
  `src/ExpoYandexMapKit.types.ts`, the Kotlin `View` block, the Swift `View` block, and the
  README API tables.
- Never dispatch a view event from a view initializer on iOS — event dispatchers are installed
  after `init` returns, and pre-install dispatches are silent no-ops.

## Documentation

`README.md` (English) and `README.ru.md` (Russian) are maintained as a pair — mirror every
change in both. If they ever diverge, the English version is canonical.

## CI

Every PR and push to `main` runs `.github/workflows/ci.yaml`:

- **quality** — eslint, `tsc` build, plugin build, plugin behavior checks
  (`npm run check:plugin`), and a double `npm pack` tarball guard (the compiled plugin must ship;
  internal files must not).
- **prebuild-smoke** — `expo prebuild` on both platforms asserting the config plugin actually
  injects `expoYandexMapKit.*` + `android.minSdkVersion` into the generated projects, idempotently.
- **android** — compiles the module Kotlin against the real pinned MapKit artifact.
- **ios** — full example build on a macOS runner (pod install pulls the real YandexMapsMobile pod,
  `xcodebuild` compiles the Swift for the iOS Simulator).

`.github/workflows/mapkit-version-watch.yaml` runs weekly and opens a bump issue when Yandex
publishes a MapKit newer than our pinned default on both Maven Central and CocoaPods.

PRs should be green across all four CI jobs before merge.

## Commit style

Conventional commits (`feat(android): …`, `fix(plugin): …`, `docs: …`, `ci: …`). Put what was
*verified* (and what wasn't) in the body — the git log doubles as the engineering record.

## Releasing

### One-time setup (maintainers)

1. npm account with **2FA enabled**; create the **`softwhere-uz` org** on npm (free for public
   packages — the GitHub org does not reserve the npm scope, they are separate namespaces).
2. `npm login` on the publishing machine.
3. **First publish** (also reserves the names — do this before the library is widely announced):

   ```sh
   # from the repo root:
   npm publish                    # unscoped → public by default

   cd alias
   npm publish --access public    # REQUIRED flag: scoped publishes default to
                                  # restricted and error on a free/org plan without it
   ```

4. On npmjs.com → `expo-yandex-mapkit` → Settings → **Publishing access**: configure the
   **trusted publisher** pointing at this repo and `.github/workflows/release.yaml`. From then on
   CI publishes with provenance via OIDC and no long-lived npm token exists anywhere.
5. Optional defensive reservations (pointer-stub READMEs): `expo-yamap`,
   `react-native-yandex-mapkit`.

### Every release

```sh
# 1. update CHANGELOG.md (move Unreleased → the new version)
# 2. then:
npm version patch|minor|major    # bumps package.json, commits, tags vX.Y.Z
git push --follow-tags           # the v* tag triggers .github/workflows/release.yaml
```

The workflow lints, builds, checks the tag matches `package.json`, verifies the packed tarball
actually contains the compiled config plugin, publishes to npm with `--provenance`, and creates
the GitHub release with generated notes.

The `alias/` package is **never** republished — its `"expo-yandex-mapkit": "*"` dependency always
resolves to the latest root release.
