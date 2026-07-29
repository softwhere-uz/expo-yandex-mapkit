package expo.modules.yandexmapkit

import com.yandex.mapkit.MapKitFactory
import com.yandex.mapkit.offline_cache.OfflineCacheManager
import com.yandex.mapkit.offline_cache.RegionState
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Full-flavor implementation of the Offline maps module — download map regions for offline use via
// MapKit's OfflineCacheManager. Compiled only under the `full` MapKit flavor (android/build.gradle
// picks src/mapkit/full); lite gets the rejecting stub. See [[v2-full-flavor-architecture]].
//
// NOTE: offline caching also requires a **paid Yandex MapKit license** that permits it — the free
// tier does not. Progress/state are polled (getRegions / getRegionState / getRegionProgress).
class ExpoYandexOfflineModule : Module() {
  private val manager: OfflineCacheManager
    get() = MapKitFactory.getInstance().offlineCacheManager

  override fun definition() = ModuleDefinition {
    Name("ExpoYandexOffline")

    AsyncFunction("getRegions") { promise: Promise ->
      val regions = manager.regions().map { region ->
        mapOf(
          "id" to region.id,
          "name" to region.name,
          "country" to region.country,
          "center" to mapOf(
            "latitude" to region.center.latitude,
            "longitude" to region.center.longitude
          ),
          "state" to stateName(manager.getState(region.id)),
          "progress" to manager.getProgress(region.id).toDouble()
        )
      }
      promise.resolve(regions)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("getRegionState") { regionId: Int, promise: Promise ->
      promise.resolve(stateName(manager.getState(regionId)))
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("getRegionProgress") { regionId: Int, promise: Promise ->
      promise.resolve(manager.getProgress(regionId).toDouble())
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("startDownload") { regionId: Int, promise: Promise ->
      manager.startDownload(regionId)
      promise.resolve(null)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("stopDownload") { regionId: Int, promise: Promise ->
      manager.stopDownload(regionId)
      promise.resolve(null)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("pauseDownload") { regionId: Int, promise: Promise ->
      manager.pauseDownload(regionId)
      promise.resolve(null)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("dropRegion") { regionId: Int, promise: Promise ->
      manager.drop(regionId)
      promise.resolve(null)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("allowUseCellularNetwork") { allow: Boolean, promise: Promise ->
      manager.allowUseCellularNetwork(allow)
      promise.resolve(null)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("clearCache") { promise: Promise ->
      manager.clear { promise.resolve(null) }
    }.runOnQueue(Queues.MAIN)
  }

  private fun stateName(state: RegionState): String = when (state) {
    RegionState.AVAILABLE -> "available"
    RegionState.DOWNLOADING -> "downloading"
    RegionState.PAUSED -> "paused"
    RegionState.COMPLETED -> "completed"
    RegionState.OUTDATED -> "outdated"
    RegionState.UNSUPPORTED -> "unsupported"
    RegionState.NEED_UPDATE -> "needUpdate"
  }
}
