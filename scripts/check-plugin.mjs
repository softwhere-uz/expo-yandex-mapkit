// Behavior checks for the compiled config plugin (plugin/build), invoked by CI's
// quality job and runnable locally via `npm run check:plugin`. Exercises the
// registered mods directly with simulated modResults — no expo prebuild needed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Derive the expected pin from the plugin source so a routine version bump can't
// break this script — it cross-checks source vs compiled output instead.
const pluginSource = readFileSync(new URL('../plugin/src/index.ts', import.meta.url), 'utf8');
const DEFAULT_VERSION = /DEFAULT_VERSION = '([\d.]+)'/.exec(pluginSource)[1];
const DEFAULT_FLAVOR = /DEFAULT_FLAVOR = '([a-z]+)'/.exec(pluginSource)[1];
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

const gradleValue = (items, key) => items.filter((i) => i.type === 'property' && i.key === key).map((i) => i.value);

// 1. Defaults: no props → pinned defaults, minSdk floored to 26 when absent.
{
  const { gradle, pod } = await runMods(undefined);
  assert.deepEqual(gradleValue(gradle, 'expoYandexMapKit.version'), [DEFAULT_VERSION]);
  assert.deepEqual(gradleValue(gradle, 'expoYandexMapKit.flavor'), [DEFAULT_FLAVOR]);
  assert.deepEqual(gradleValue(gradle, 'android.minSdkVersion'), ['26']);
  assert.equal(pod['expoYandexMapKit.version'], DEFAULT_VERSION);
  assert.equal(pod['expoYandexMapKit.flavor'], DEFAULT_FLAVOR);
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
  const twice = await config.mods.android.gradleProperties({ ...config, modResults: once.modResults });
  assert.deepEqual(gradleValue(twice.modResults, 'expoYandexMapKit.flavor'), ['full']);
  assert.deepEqual(gradleValue(twice.modResults, 'expoYandexMapKit.version'), [DEFAULT_VERSION]);
}

// 5. Validation: bad flavor / non-semver version throw descriptive, scoped errors.
{
  assert.throws(() => withPlugin(baseConfig(), { flavor: 'foo' }), /flavor/);
  assert.throws(() => withPlugin(baseConfig(), { version: '4.42' }), /version/);
  assert.throws(() => withPlugin(baseConfig(), { ios: { version: 'latest' } }), /ios/);
}

console.log('plugin behavior checks: all passed');
