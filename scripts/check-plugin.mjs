// Behavior checks for the compiled config plugin (plugin/build), invoked by CI's
// quality job and runnable locally via `npm run check:plugin`. Exercises the
// registered mods directly with simulated modResults — no expo prebuild needed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Derive the expected pins from the plugin source so a routine version bump can't
// break this script — it cross-checks source vs compiled output instead.
const pluginSource = readFileSync(new URL('../plugin/src/index.ts', import.meta.url), 'utf8');

// Fail with a named message if a constant is renamed/re-quoted, instead of a cryptic
// `null[1]` TypeError from an unmatched regex.
function extract(label, pattern, source = pluginSource) {
  const match = pattern.exec(source);
  assert.ok(match, `check-plugin: could not find ${label}`);
  return match[1];
}

const DEFAULT_VERSION = extract('DEFAULT_VERSION', /DEFAULT_VERSION = '([\d.]+)'/);
const DEFAULT_FLAVOR = extract('DEFAULT_FLAVOR', /DEFAULT_FLAVOR = '([a-z]+)'/);
const MIN_IOS_DEPLOYMENT_TARGET = extract(
  'MIN_IOS_DEPLOYMENT_TARGET',
  /MIN_IOS_DEPLOYMENT_TARGET = '([\d.]+)'/
);

// Build-time key/locale destination names — the plugin writes them, the native modules read
// them, so they are a cross-file contract like the podspec iOS floor below.
const ANDROID_API_KEY_METADATA = extract(
  'ANDROID_API_KEY_METADATA',
  /ANDROID_API_KEY_METADATA = '([^']+)'/
);
const ANDROID_LOCALE_METADATA = extract(
  'ANDROID_LOCALE_METADATA',
  /ANDROID_LOCALE_METADATA = '([^']+)'/
);
const IOS_API_KEY_INFO_PLIST_KEY = extract(
  'IOS_API_KEY_INFO_PLIST_KEY',
  /IOS_API_KEY_INFO_PLIST_KEY = '([^']+)'/
);
const IOS_LOCALE_INFO_PLIST_KEY = extract(
  'IOS_LOCALE_INFO_PLIST_KEY',
  /IOS_LOCALE_INFO_PLIST_KEY = '([^']+)'/
);

// Assert the native modules actually read the same names the plugin writes — a rename on one
// side without the other would silently disable build-time auto-init.
const androidModuleSource = readFileSync(
  new URL(
    '../android/src/main/java/expo/modules/yandexmapkit/ExpoYandexMapKitModule.kt',
    import.meta.url
  ),
  'utf8'
);
const iosModuleSource = readFileSync(
  new URL('../ios/ExpoYandexMapKitModule.swift', import.meta.url),
  'utf8'
);
assert.ok(
  androidModuleSource.includes(`"${ANDROID_API_KEY_METADATA}"`),
  `Android module must read the API key metadata "${ANDROID_API_KEY_METADATA}"`
);
assert.ok(
  androidModuleSource.includes(`"${ANDROID_LOCALE_METADATA}"`),
  `Android module must read the locale metadata "${ANDROID_LOCALE_METADATA}"`
);
assert.ok(
  iosModuleSource.includes(`"${IOS_API_KEY_INFO_PLIST_KEY}"`),
  `iOS module must read the Info.plist key "${IOS_API_KEY_INFO_PLIST_KEY}"`
);
assert.ok(
  iosModuleSource.includes(`"${IOS_LOCALE_INFO_PLIST_KEY}"`),
  `iOS module must read the Info.plist key "${IOS_LOCALE_INFO_PLIST_KEY}"`
);

// Single source of truth for the iOS floor: the podspec's platform pin must match the
// plugin constant, since CI and this script both derive their assertion from the plugin.
const podspecSource = readFileSync(
  new URL('../ios/ExpoYandexMapKit.podspec', import.meta.url),
  'utf8'
);
const podspecIosTarget = extract('podspec :ios platform', /:ios\s*=>\s*'([\d.]+)'/, podspecSource);
assert.equal(
  podspecIosTarget,
  MIN_IOS_DEPLOYMENT_TARGET,
  `podspec :ios platform (${podspecIosTarget}) must match plugin MIN_IOS_DEPLOYMENT_TARGET (${MIN_IOS_DEPLOYMENT_TARGET})`
);

const loaded = require('../app.plugin.js');
const withPlugin = loaded.default ?? loaded;
assert.equal(typeof withPlugin, 'function', 'app.plugin.js must export a config plugin function');

const baseConfig = () => ({ name: 'check', slug: 'check' });

async function runMods(props, { gradleInit = [], podInit = {} } = {}) {
  const config = withPlugin(baseConfig(), props);
  const gradle = await config.mods.android.gradleProperties({ ...config, modResults: gradleInit });
  const pod = await config.mods.ios.podfileProperties({ ...config, modResults: podInit });
  return { gradle: gradle.modResults, pod: pod.modResults };
}

const gradleValue = (items, key) =>
  items.filter((i) => i.type === 'property' && i.key === key).map((i) => i.value);

// 1. Defaults: no props → pinned defaults, minSdk floored to 26 when absent.
{
  const { gradle, pod } = await runMods(undefined);
  assert.deepEqual(gradleValue(gradle, 'expoYandexMapKit.version'), [DEFAULT_VERSION]);
  assert.deepEqual(gradleValue(gradle, 'expoYandexMapKit.flavor'), [DEFAULT_FLAVOR]);
  assert.deepEqual(gradleValue(gradle, 'android.minSdkVersion'), ['26']);
  assert.equal(pod['expoYandexMapKit.version'], DEFAULT_VERSION);
  assert.equal(pod['expoYandexMapKit.flavor'], DEFAULT_FLAVOR);
  assert.equal(pod['ios.deploymentTarget'], MIN_IOS_DEPLOYMENT_TARGET);
}

// 2. minSdk floor: 24 → 26; an existing higher value is never lowered.
{
  const low = await runMods(undefined, {
    gradleInit: [{ type: 'property', key: 'android.minSdkVersion', value: '24' }],
  });
  assert.deepEqual(gradleValue(low.gradle, 'android.minSdkVersion'), ['26']);

  const high = await runMods(undefined, {
    gradleInit: [{ type: 'property', key: 'android.minSdkVersion', value: '34' }],
  });
  assert.deepEqual(gradleValue(high.gradle, 'android.minSdkVersion'), ['34']);
}

// 3. Per-platform overrides: platform value ?? top-level ?? default.
{
  const { gradle, pod } = await runMods({ version: '4.50.0', ios: { flavor: 'full' } });
  assert.deepEqual(gradleValue(gradle, 'expoYandexMapKit.version'), ['4.50.0']);
  assert.deepEqual(gradleValue(gradle, 'expoYandexMapKit.flavor'), [DEFAULT_FLAVOR]);
  assert.equal(pod['expoYandexMapKit.version'], '4.50.0');
  assert.equal(pod['expoYandexMapKit.flavor'], 'full');
}

// 4. Upsert idempotency: applying the gradle mod to its own output must not duplicate keys.
{
  const config = withPlugin(baseConfig(), { flavor: 'full' });
  const once = await config.mods.android.gradleProperties({ ...config, modResults: [] });
  const twice = await config.mods.android.gradleProperties({
    ...config,
    modResults: once.modResults,
  });
  assert.deepEqual(gradleValue(twice.modResults, 'expoYandexMapKit.flavor'), ['full']);
  assert.deepEqual(gradleValue(twice.modResults, 'expoYandexMapKit.version'), [DEFAULT_VERSION]);
}

// 5. Validation: bad flavor / non-semver version throw descriptive, scoped errors.
{
  assert.throws(() => withPlugin(baseConfig(), { flavor: 'foo' }), /flavor/);
  assert.throws(() => withPlugin(baseConfig(), { version: '4.42' }), /version/);
  assert.throws(() => withPlugin(baseConfig(), { ios: { version: 'latest' } }), /ios/);
}

// 6. iOS deployment target floor (Podfile.properties.json): raised to the minimum
//    when missing or lower; an existing equal or higher value is never rewritten.
{
  const low = await runMods(undefined, { podInit: { 'ios.deploymentTarget': '15.1' } });
  assert.equal(low.pod['ios.deploymentTarget'], MIN_IOS_DEPLOYMENT_TARGET);

  const equal = await runMods(undefined, {
    podInit: { 'ios.deploymentTarget': MIN_IOS_DEPLOYMENT_TARGET },
  });
  assert.equal(equal.pod['ios.deploymentTarget'], MIN_IOS_DEPLOYMENT_TARGET);

  const high = await runMods(undefined, { podInit: { 'ios.deploymentTarget': '17.0' } });
  assert.equal(high.pod['ios.deploymentTarget'], '17.0');
}

// 7. iOS deployment target floor (Xcode project), raise-only and inheritance-aware:
//    - a concrete numeric target below the floor is raised (declared or quoted);
//    - at-or-above values and macro/`$(inherited)` references are left untouched;
//    - a config that omits the key is floored only when its project-level counterpart
//      (same configuration name) is missing or below the floor — never lowering a config
//      that inherits a higher target.
{
  const config = withPlugin(baseConfig(), undefined);
  const bc = {
    // Project-level configs (referenced by the root project's configuration list).
    projDebug: { name: 'Debug', buildSettings: { IPHONEOS_DEPLOYMENT_TARGET: '17.0' } },
    projRelease: { name: 'Release', buildSettings: { IPHONEOS_DEPLOYMENT_TARGET: '15.1' } },
    // Target-level configs.
    below: { name: 'Debug', buildSettings: { IPHONEOS_DEPLOYMENT_TARGET: '15.1' } },
    atFloor: {
      name: 'Debug',
      buildSettings: { IPHONEOS_DEPLOYMENT_TARGET: MIN_IOS_DEPLOYMENT_TARGET },
    },
    above: { name: 'Debug', buildSettings: { IPHONEOS_DEPLOYMENT_TARGET: '17.0' } },
    quotedLow: { name: 'Debug', buildSettings: { IPHONEOS_DEPLOYMENT_TARGET: '"15.1"' } },
    quotedHigh: { name: 'Debug', buildSettings: { IPHONEOS_DEPLOYMENT_TARGET: '"17.0"' } },
    macro: { name: 'Debug', buildSettings: { IPHONEOS_DEPLOYMENT_TARGET: '$(inherited)' } },
    omitInheritsHigh: { name: 'Debug', buildSettings: { PRODUCT_NAME: 'x' } },
    omitInheritsLow: { name: 'Release', buildSettings: { PRODUCT_NAME: 'x' } },
    omitNoProjectConfig: { name: 'Beta', buildSettings: { PRODUCT_NAME: 'x' } },
    A_comment: 'Debug',
  };
  await config.mods.ios.xcodeproj({
    ...config,
    modResults: {
      pbxXCBuildConfigurationSection: () => bc,
      getFirstProject: () => ({ firstProject: { buildConfigurationList: 'rootList' } }),
      pbxXCConfigurationList: () => ({
        rootList: { buildConfigurations: [{ value: 'projDebug' }, { value: 'projRelease' }] },
      }),
    },
  });
  const dt = (k) => bc[k].buildSettings.IPHONEOS_DEPLOYMENT_TARGET;
  assert.equal(dt('projDebug'), '17.0'); // project high kept
  assert.equal(dt('projRelease'), MIN_IOS_DEPLOYMENT_TARGET); // project below raised
  assert.equal(dt('below'), MIN_IOS_DEPLOYMENT_TARGET); // declared below raised
  assert.equal(dt('atFloor'), MIN_IOS_DEPLOYMENT_TARGET); // at floor unchanged
  assert.equal(dt('above'), '17.0'); // above kept
  assert.equal(dt('quotedLow'), MIN_IOS_DEPLOYMENT_TARGET); // quoted below raised
  assert.equal(dt('quotedHigh'), '"17.0"'); // quoted high kept verbatim
  assert.equal(dt('macro'), '$(inherited)'); // macro preserved
  assert.equal(dt('omitInheritsHigh'), undefined); // inherits Debug 17.0 -> not lowered
  assert.equal(dt('omitInheritsLow'), MIN_IOS_DEPLOYMENT_TARGET); // inherits Release 15.1 -> floored
  assert.equal(dt('omitNoProjectConfig'), MIN_IOS_DEPLOYMENT_TARGET); // no project fallback -> floored
}

// Minimal AndroidManifest whose main <application> the manifest mod can locate.
const manifestInit = () => ({
  manifest: { application: [{ $: { 'android:name': '.MainApplication' } }] },
});
const mainApplicationOf = (modResults) => modResults.manifest.application[0];
const metaValues = (application, name) =>
  (application['meta-data'] ?? [])
    .filter((item) => item.$['android:name'] === name)
    .map((item) => item.$['android:value']);

// 8. Build-time API key + locale injection: AndroidManifest <meta-data> + iOS Info.plist.
{
  const config = withPlugin(baseConfig(), { apiKey: 'test-key', locale: 'en_US' });

  const manifest = await config.mods.android.manifest({ ...config, modResults: manifestInit() });
  const app = mainApplicationOf(manifest.modResults);
  assert.deepEqual(metaValues(app, ANDROID_API_KEY_METADATA), ['test-key']);
  assert.deepEqual(metaValues(app, ANDROID_LOCALE_METADATA), ['en_US']);

  const plist = await config.mods.ios.infoPlist({ ...config, modResults: {} });
  assert.equal(plist.modResults[IOS_API_KEY_INFO_PLIST_KEY], 'test-key');
  assert.equal(plist.modResults[IOS_LOCALE_INFO_PLIST_KEY], 'en_US');
}

// 9. No apiKey/locale → the manifest/infoPlist mods are not registered at all, so the runtime
//    initialize(apiKey) path is completely untouched.
{
  const config = withPlugin(baseConfig(), { flavor: 'lite' });
  assert.equal(
    config.mods.android.manifest,
    undefined,
    'manifest mod must not be registered without apiKey/locale'
  );
  assert.equal(
    config.mods.ios.infoPlist,
    undefined,
    'infoPlist mod must not be registered without apiKey/locale'
  );
}

// 10. Per-platform override: android key overrides the top-level key; ios inherits it.
//     A shared top-level locale reaches both platforms.
{
  const config = withPlugin(baseConfig(), {
    apiKey: 'top-key',
    locale: 'ru_RU',
    android: { apiKey: 'android-key' },
  });

  const manifest = await config.mods.android.manifest({ ...config, modResults: manifestInit() });
  const app = mainApplicationOf(manifest.modResults);
  assert.deepEqual(metaValues(app, ANDROID_API_KEY_METADATA), ['android-key']);
  assert.deepEqual(metaValues(app, ANDROID_LOCALE_METADATA), ['ru_RU']);

  const plist = await config.mods.ios.infoPlist({ ...config, modResults: {} });
  assert.equal(plist.modResults[IOS_API_KEY_INFO_PLIST_KEY], 'top-key');
  assert.equal(plist.modResults[IOS_LOCALE_INFO_PLIST_KEY], 'ru_RU');
}

// 11. Manifest injection is idempotent: applying the mod to its own output must not duplicate
//     the <meta-data> entries (prebuild is not clean by default and re-runs the mods).
{
  const config = withPlugin(baseConfig(), { apiKey: 'k1', locale: 'en_US' });
  const once = await config.mods.android.manifest({ ...config, modResults: manifestInit() });
  const twice = await config.mods.android.manifest({ ...config, modResults: once.modResults });
  const app = mainApplicationOf(twice.modResults);
  assert.deepEqual(metaValues(app, ANDROID_API_KEY_METADATA), ['k1']);
  assert.deepEqual(metaValues(app, ANDROID_LOCALE_METADATA), ['en_US']);
}

// 12. Only a locale (no apiKey) still injects on BOTH platforms — the native runtime-key path
//     reads and applies it, so neither the manifest nor the Info.plist may drop it.
{
  const config = withPlugin(baseConfig(), { locale: 'tr_TR' });
  const manifest = await config.mods.android.manifest({ ...config, modResults: manifestInit() });
  const app = mainApplicationOf(manifest.modResults);
  assert.deepEqual(metaValues(app, ANDROID_API_KEY_METADATA), []);
  assert.deepEqual(metaValues(app, ANDROID_LOCALE_METADATA), ['tr_TR']);

  const plist = await config.mods.ios.infoPlist({ ...config, modResults: {} });
  assert.equal(plist.modResults[IOS_API_KEY_INFO_PLIST_KEY], undefined);
  assert.equal(plist.modResults[IOS_LOCALE_INFO_PLIST_KEY], 'tr_TR');
}

// 13. A whitespace-padded apiKey is trimmed before injection, so the stored value is canonical and
//     matches a later runtime initialize() with the clean key (native readers trim too).
{
  const config = withPlugin(baseConfig(), { apiKey: '  spaced-key  ' });
  const manifest = await config.mods.android.manifest({ ...config, modResults: manifestInit() });
  assert.deepEqual(
    metaValues(mainApplicationOf(manifest.modResults), ANDROID_API_KEY_METADATA),
    ['spaced-key']
  );
  const plist = await config.mods.ios.infoPlist({ ...config, modResults: {} });
  assert.equal(plist.modResults[IOS_API_KEY_INFO_PLIST_KEY], 'spaced-key');
}

// 14. Platform-scoped-only injection: a key set under `ios`/`android` only registers that one
//     platform's mod and leaves the other's undefined. This is the asymmetric path most likely to
//     regress — each of withAndroidApiKey/withIosApiKey short-circuits on its own resolved values.
{
  const iosOnly = withPlugin(baseConfig(), { ios: { apiKey: 'ios-only', locale: 'en_US' } });
  assert.equal(
    iosOnly.mods.android.manifest,
    undefined,
    'ios-scoped key must not register the Android manifest mod'
  );
  const iosPlist = await iosOnly.mods.ios.infoPlist({ ...iosOnly, modResults: {} });
  assert.equal(iosPlist.modResults[IOS_API_KEY_INFO_PLIST_KEY], 'ios-only');
  assert.equal(iosPlist.modResults[IOS_LOCALE_INFO_PLIST_KEY], 'en_US');

  const androidOnly = withPlugin(baseConfig(), { android: { apiKey: 'android-only', locale: 'ru_RU' } });
  assert.equal(
    androidOnly.mods.ios.infoPlist,
    undefined,
    'android-scoped key must not register the iOS infoPlist mod'
  );
  const androidManifest = await androidOnly.mods.android.manifest({
    ...androidOnly,
    modResults: manifestInit(),
  });
  const app = mainApplicationOf(androidManifest.modResults);
  assert.deepEqual(metaValues(app, ANDROID_API_KEY_METADATA), ['android-only']);
  assert.deepEqual(metaValues(app, ANDROID_LOCALE_METADATA), ['ru_RU']);
}

// 15. Validation: bad/non-string locale, blank/non-string apiKey throw scoped errors. The
//     non-string locale case guards the RegExp.test coercion footgun (["en_US"] -> "en_US").
{
  assert.throws(() => withPlugin(baseConfig(), { locale: 'english' }), /locale/);
  assert.throws(() => withPlugin(baseConfig(), { locale: 'e_US' }), /locale/);
  assert.throws(() => withPlugin(baseConfig(), { locale: ['en_US'] }), /locale/);
  assert.throws(() => withPlugin(baseConfig(), { apiKey: '   ' }), /apiKey/);
  assert.throws(() => withPlugin(baseConfig(), { apiKey: 123 }), /apiKey/);
  assert.throws(() => withPlugin(baseConfig(), { ios: { locale: 'e_US' } }), /ios\./);
}

console.log('plugin behavior checks: all passed');
