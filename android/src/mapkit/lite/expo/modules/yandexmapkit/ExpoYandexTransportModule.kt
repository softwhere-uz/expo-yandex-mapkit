package expo.modules.yandexmapkit

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Lite-flavor stub of the Transport (routing) module. The lite MapKit artifact does not ship the
// directions / transport classes, so routing is unavailable and the call rejects with a clear
// message. The full flavor (src/mapkit/full) provides the real implementation of this same class.
class ExpoYandexTransportModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoYandexTransport")

    AsyncFunction("findRoutes") { _: List<PointRecord>, _: String, _: DrivingRouteOptionsRecord?, promise: Promise ->
      promise.reject("E_FULL_REQUIRED", FULL_REQUIRED_MESSAGE, null)
    }
  }
}

private const val FULL_REQUIRED_MESSAGE =
  "expo-yandex-mapkit: routing requires the MapKit full flavor. " +
    "Set flavor: 'full' in the config plugin (and rebuild)."
