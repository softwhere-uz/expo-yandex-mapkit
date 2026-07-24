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

console.log('plugin behavior checks: all passed');
