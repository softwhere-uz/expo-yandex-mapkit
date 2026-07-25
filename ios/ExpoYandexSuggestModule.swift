import ExpoModulesCore
#if YANDEX_MAPS_FULL
  import YandexMapsMobile
#endif

// Suggest option records (shared shape regardless of flavor; no MapKit types, so always compiled).
// They reuse PointRecord from the map view module.
internal struct SuggestBoundingBoxRecord: Record {
  @Field var southWest: PointRecord?
  @Field var northEast: PointRecord?
}

internal struct SuggestOptionsRecord: Record {
  @Field var userPosition: PointRecord?
  @Field var boundingBox: SuggestBoundingBoxRecord?
  @Field var suggestWords: Bool = true
  // Any of "geo" | "biz" | "transit"; nil means all three.
  @Field var types: [String]?
}

// The Suggest module (search-as-you-type). The real implementation is behind `#if YANDEX_MAPS_FULL`
// — it references classes the lite pod does not ship, so it is compiled only when the full flavor is
// selected (the podspec sets the YANDEX_MAPS_FULL compilation condition then). In lite, every call
// rejects with a clear message. Each item's `center` coordinate is read natively (MapKit >= 4.3.0)
// so results carry coordinates directly (the lineage's recurring missing-coordinates bug came from
// re-parsing the URI in JS instead).
public class ExpoYandexSuggestModule: Module {
  #if YANDEX_MAPS_FULL
    private var searchManager: YMKSearchManager?
    private var suggestSession: YMKSearchSuggestSession?
  #endif

  public func definition() -> ModuleDefinition {
    Name("ExpoYandexSuggest")

    AsyncFunction("suggest") { (query: String, options: SuggestOptionsRecord?, promise: Promise) in
      #if YANDEX_MAPS_FULL
        let session = self.ensureSession()
        let suggestOptions = YMKSuggestOptions()
        suggestOptions.suggestTypes = self.resolveSuggestTypes(options?.types)
        if let position = options?.userPosition {
          suggestOptions.userPosition = YMKPoint(
            latitude: position.latitude, longitude: position.longitude)
        }
        session.suggest(
          withText: query,
          window: self.resolveWindow(options?.boundingBox),
          suggestOptions: suggestOptions
        ) { response, error in
          if let error = error {
            promise.reject(
              "E_SUGGEST", "expo-yandex-mapkit: suggest failed — \(error.localizedDescription)")
            return
          }
          promise.resolve((response?.items ?? []).map { self.serialize($0) })
        }
      #else
        promise.reject(
          "E_FULL_REQUIRED",
          "expo-yandex-mapkit: suggest() requires the MapKit full flavor. "
            + "Set flavor: 'full' in the config plugin (and rebuild).")
      #endif
    }.runOnQueue(.main)

    Function("reset") {
      #if YANDEX_MAPS_FULL
        self.suggestSession?.reset()
      #endif
    }
  }

  #if YANDEX_MAPS_FULL
    // Create (once) the search manager + suggest session. The search manager needs the MapKit API
    // key, which the main module's initialize()/build-time key sets; a call before that fails.
    private func ensureSession() -> YMKSearchSuggestSession {
      let manager =
        searchManager ?? YMKSearchFactory.instance().createSearchManager(with: .combined)
      searchManager = manager
      let session = suggestSession ?? manager.createSuggestSession()
      suggestSession = session
      return session
    }

    private func resolveSuggestTypes(_ types: [String]?) -> YMKSuggestType {
      let list = types ?? ["geo", "biz", "transit"]
      var result: YMKSuggestType = []
      for type in list {
        switch type {
        case "geo": result.insert(.geo)
        case "biz": result.insert(.biz)
        case "transit": result.insert(.transit)
        default: break
        }
      }
      return result.isEmpty ? [.geo, .biz, .transit] : result
    }

    // The suggest API requires a window; use the supplied bounding box or a world-spanning default.
    private func resolveWindow(_ box: SuggestBoundingBoxRecord?) -> YMKBoundingBox {
      if let sw = box?.southWest, let ne = box?.northEast {
        return YMKBoundingBox(
          southWest: YMKPoint(latitude: sw.latitude, longitude: sw.longitude),
          northEast: YMKPoint(latitude: ne.latitude, longitude: ne.longitude))
      }
      return YMKBoundingBox(
        southWest: YMKPoint(latitude: -90, longitude: -180),
        northEast: YMKPoint(latitude: 90, longitude: 180))
    }

    private func serialize(_ item: YMKSuggestItem) -> [String: Any?] {
      var result: [String: Any?] = [
        "title": item.title.text,
        "searchText": item.searchText,
      ]
      if let subtitle = item.subtitle {
        result["subtitle"] = subtitle.text
      }
      if let uri = item.uri {
        result["uri"] = uri
      }
      if let distance = item.distance {
        result["distance"] = distance.text
      }
      if let center = item.center {
        result["center"] = ["latitude": center.latitude, "longitude": center.longitude]
      }
      return result
    }
  #endif
}
