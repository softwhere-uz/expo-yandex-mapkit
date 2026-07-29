import ExpoModulesCore
#if YANDEX_MAPS_FULL
  import YandexMapsMobile
#endif

// The Offline maps module — download map regions for offline use via MapKit's OfflineCacheManager.
// This is a **full-flavor + paid-license** MapKit feature: the real work is behind
// `#if YANDEX_MAPS_FULL`, and even then the SDK requires a Yandex MapKit license that permits offline
// caching (the free tier does not). In the lite flavor every call rejects with a clear message.
// Surface: list regions, control a region's download (start / stop / pause / drop), clear the cache.
// Progress/state are polled (getRegions / getRegionState / getRegionProgress).
public class ExpoYandexOfflineModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoYandexOffline")

    AsyncFunction("getRegions") { (promise: Promise) in
      #if YANDEX_MAPS_FULL
        let manager = YMKMapKit.sharedInstance().offlineCacheManager
        let regions: [[String: Any]] = manager.regions().map { region in
          [
            "id": Int(region.id),
            "name": region.name,
            "country": region.country,
            "center": ["latitude": region.center.latitude, "longitude": region.center.longitude],
            "state": Self.stateName(manager.state(withRegionId: region.id)),
            "progress": Double(manager.progress(withRegionId: region.id)),
          ]
        }
        promise.resolve(regions)
      #else
        promise.reject("E_FULL_REQUIRED", Self.fullRequiredMessage)
      #endif
    }.runOnQueue(.main)

    AsyncFunction("getRegionState") { (regionId: Int, promise: Promise) in
      #if YANDEX_MAPS_FULL
        let manager = YMKMapKit.sharedInstance().offlineCacheManager
        promise.resolve(Self.stateName(manager.state(withRegionId: UInt(regionId))))
      #else
        promise.reject("E_FULL_REQUIRED", Self.fullRequiredMessage)
      #endif
    }.runOnQueue(.main)

    AsyncFunction("getRegionProgress") { (regionId: Int, promise: Promise) in
      #if YANDEX_MAPS_FULL
        let manager = YMKMapKit.sharedInstance().offlineCacheManager
        promise.resolve(Double(manager.progress(withRegionId: UInt(regionId))))
      #else
        promise.reject("E_FULL_REQUIRED", Self.fullRequiredMessage)
      #endif
    }.runOnQueue(.main)

    AsyncFunction("startDownload") { (regionId: Int, promise: Promise) in
      Self.runRegionCommand(regionId, "start", promise)
    }.runOnQueue(.main)

    AsyncFunction("stopDownload") { (regionId: Int, promise: Promise) in
      Self.runRegionCommand(regionId, "stop", promise)
    }.runOnQueue(.main)

    AsyncFunction("pauseDownload") { (regionId: Int, promise: Promise) in
      Self.runRegionCommand(regionId, "pause", promise)
    }.runOnQueue(.main)

    AsyncFunction("dropRegion") { (regionId: Int, promise: Promise) in
      Self.runRegionCommand(regionId, "drop", promise)
    }.runOnQueue(.main)

    AsyncFunction("allowUseCellularNetwork") { (allow: Bool, promise: Promise) in
      #if YANDEX_MAPS_FULL
        YMKMapKit.sharedInstance().offlineCacheManager.allowUseCellularNetwork(withUseCellular: allow)
        promise.resolve(nil)
      #else
        promise.reject("E_FULL_REQUIRED", Self.fullRequiredMessage)
      #endif
    }.runOnQueue(.main)

    AsyncFunction("clearCache") { (promise: Promise) in
      #if YANDEX_MAPS_FULL
        YMKMapKit.sharedInstance().offlineCacheManager.clear {
          promise.resolve(nil)
        }
      #else
        promise.reject("E_FULL_REQUIRED", Self.fullRequiredMessage)
      #endif
    }.runOnQueue(.main)
  }

  private static let fullRequiredMessage =
    "expo-yandex-mapkit: offline maps require the MapKit full flavor AND a paid Yandex MapKit "
    + "license that permits offline caching. Set flavor: 'full' in the config plugin (and rebuild)."

  // Run a region-id-based command on the cache manager (start / stop / pause / drop). Defined for
  // both flavors so the flavor-agnostic call sites in `definition()` compile either way; on lite it
  // rejects.
  private static func runRegionCommand(_ regionId: Int, _ command: String, _ promise: Promise) {
    #if YANDEX_MAPS_FULL
      let manager = YMKMapKit.sharedInstance().offlineCacheManager
      let id = UInt(regionId)
      switch command {
      case "start": manager.startDownload(withRegionId: id)
      case "stop": manager.stopDownload(withRegionId: id)
      case "pause": manager.pauseDownload(withRegionId: id)
      case "drop": manager.drop(withRegionId: id)
      default: break
      }
      promise.resolve(nil)
    #else
      promise.reject("E_FULL_REQUIRED", Self.fullRequiredMessage)
    #endif
  }

  #if YANDEX_MAPS_FULL
    private static func stateName(_ state: YMKOfflineCacheRegionState) -> String {
      switch state {
      case .available: return "available"
      case .downloading: return "downloading"
      case .paused: return "paused"
      case .completed: return "completed"
      case .outdated: return "outdated"
      case .unsupported: return "unsupported"
      case .needUpdate: return "needUpdate"
      @unknown default: return "unsupported"
      }
    }
  #endif
}
