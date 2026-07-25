package expo.modules.yandexmapkit

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Lite-flavor stub of the Suggest module. The lite MapKit artifact does not ship the search classes,
// so search-as-you-type is unavailable and every call rejects with a clear message. The full flavor
// (src/mapkit/full) provides the real implementation of this same class. Keeping the JS-facing
// signature identical means callers get a graceful rejection rather than a "function not found".
class ExpoYandexSuggestModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoYandexSuggest")

    AsyncFunction("suggest") { _: String, _: SuggestOptionsRecord?, promise: Promise ->
      promise.reject("E_FULL_REQUIRED", FULL_REQUIRED_MESSAGE, null)
    }

    Function("reset") {
      // No-op: there is no suggest session in the lite flavor.
    }
  }
}

private const val FULL_REQUIRED_MESSAGE =
  "expo-yandex-mapkit: suggest() requires the MapKit full flavor. " +
    "Set flavor: 'full' in the config plugin (and rebuild)."
