package expo.modules.yandexmapkit

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Lite-flavor stub of the Search module. The lite MapKit artifact does not ship the search classes,
// so text search / reverse geocoding are unavailable and every call rejects with a clear message.
// The full flavor (src/mapkit/full) provides the real implementation of this same class.
class ExpoYandexSearchModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoYandexSearch")

    AsyncFunction("searchText") { _: String, _: SearchOptionsRecord?, promise: Promise ->
      promise.reject("E_FULL_REQUIRED", FULL_REQUIRED_MESSAGE, null)
    }

    AsyncFunction("searchPoint") { _: PointRecord, _: SearchOptionsRecord?, promise: Promise ->
      promise.reject("E_FULL_REQUIRED", FULL_REQUIRED_MESSAGE, null)
    }
  }
}

private const val FULL_REQUIRED_MESSAGE =
  "expo-yandex-mapkit: search requires the MapKit full flavor. " +
    "Set flavor: 'full' in the config plugin (and rebuild)."
