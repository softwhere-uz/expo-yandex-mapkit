package expo.modules.yandexmapkit

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Lite-flavor stub of the Offline maps module. The lite MapKit artifact does not ship the
// offline-cache classes (and offline caching needs a paid license anyway), so every call rejects
// with a clear message. The full flavor (src/mapkit/full) provides the real implementation.
class ExpoYandexOfflineModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoYandexOffline")

    AsyncFunction("getRegions") { promise: Promise -> reject(promise) }
    AsyncFunction("startDownload") { _: Int, promise: Promise -> reject(promise) }
    AsyncFunction("stopDownload") { _: Int, promise: Promise -> reject(promise) }
    AsyncFunction("pauseDownload") { _: Int, promise: Promise -> reject(promise) }
    AsyncFunction("dropRegion") { _: Int, promise: Promise -> reject(promise) }
    AsyncFunction("allowUseCellularNetwork") { _: Boolean, promise: Promise -> reject(promise) }
    AsyncFunction("clearCache") { promise: Promise -> reject(promise) }
  }

  private fun reject(promise: Promise) {
    promise.reject("E_FULL_REQUIRED", FULL_REQUIRED_MESSAGE, null)
  }
}

private const val FULL_REQUIRED_MESSAGE =
  "expo-yandex-mapkit: offline maps require the MapKit full flavor AND a paid Yandex MapKit " +
    "license that permits offline caching. Set flavor: 'full' in the config plugin (and rebuild)."
