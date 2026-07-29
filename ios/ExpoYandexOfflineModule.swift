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
            "state": Self.stateName(manager.getState(withRegionId: region.id)),
            "progress": Double(manager.getProgress(withRegionId: region.id)),
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
        promise.resolve(Self.stateName(manager.getState(withRegionId: UInt(regionId))))
      #else
        promise.reject("E_FULL_REQUIRED", Self.fullRequiredMessage)
      #endif
    }.runOnQueue(.main)

    AsyncFunction("getRegionProgress") { (regionId: Int, promise: Promise) in
      #if YANDEX_MAPS_FULL
        let manager = YMKMapKit.sharedInstance().offlineCacheManager
        promise.resolve(Double(manager.getProgress(withRegionId: UInt(regionId))))
      #else
        promise.reject("E_FULL_REQUIRED", Self.fullRequiredMessage)
      #endif
    }.runOnQueue(.main)

    AsyncFunction("startDownload") { (regionId: Int, promise: Promise) in
      Self.control(regionId, promise) { $0.startDownload(withRegionId: $1) }
    }.runOnQueue(.main)

    AsyncFunction("stopDownload") { (regionId: Int, promise: Promise) in
      Self.control(regionId, promise) { $0.stopDownload(withRegionId: $1) }
    }.runOnQueue(.main)

    AsyncFunction("pauseDownload") { (regionId: Int, promise: Promise) in
      Self.control(regionId, promise) { $0.pauseDownload(withRegionId: $1) }
    }.runOnQueue(.main)

    AsyncFunction("dropRegion") { (regionId: Int, promise: Promise) in
      Self.control(regionId, promise) { $0.drop(withRegionId: $1) }
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

  #if YANDEX_MAPS_FULL
    // Run a region-id-based command on the cache manager (start / stop / pause / drop).
    private static func control(
      _ regionId: Int, _ promise: Promise, _ command: (YMKOfflineCacheManager, UInt) -> Void
    ) {
      command(YMKMapKit.sharedInstance().offlineCacheManager, UInt(regionId))
      promise.resolve(nil)
    }

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
  #else
    private static func control(
      _ regionId: Int, _ promise: Promise, _ command: (Int) -> Void
    ) {
      promise.reject("E_FULL_REQUIRED", Self.fullRequiredMessage)
    }
  #endif
}
