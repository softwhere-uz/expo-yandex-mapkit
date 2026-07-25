import ExpoModulesCore
#if YANDEX_MAPS_FULL
  import YandexMapsMobile
#endif

// Search option record (shared shape; no MapKit types, always compiled). Reuses PointRecord and the
// SuggestBoundingBoxRecord {southWest, northEast} shape.
internal struct SearchOptionsRecord: Record {
  @Field var userPosition: PointRecord?
  @Field var boundingBox: SuggestBoundingBoxRecord?
  @Field var searchTypes: [String]?
  @Field var resultPageSize: Int?
  @Field var zoom: Int?
}

// The Search module (text search + reverse geocoding). Real work is behind `#if YANDEX_MAPS_FULL`
// (references classes the lite pod omits); in lite every call rejects clearly. See the map view
// module for the shared record types.
public class ExpoYandexSearchModule: Module {
  #if YANDEX_MAPS_FULL
    private var searchManager: YMKSearchManager?
    // Sessions must be retained until their response arrives — dropping one cancels the request.
    private var sessions: [YMKSearchSession] = []
  #endif

  public func definition() -> ModuleDefinition {
    Name("ExpoYandexSearch")

    AsyncFunction("searchText") { (query: String, options: SearchOptionsRecord?, promise: Promise) in
      #if YANDEX_MAPS_FULL
        self.retain(
          self.manager().submit(
            withText: query,
            geometry: self.resolveGeometry(options),
            searchOptions: self.searchOptions(options)
          ) { response, error in self.handle(response, error, promise) })
      #else
        promise.reject("E_FULL_REQUIRED", Self.fullRequiredMessage)
      #endif
    }.runOnQueue(.main)

    AsyncFunction("searchPoint") { (point: PointRecord, options: SearchOptionsRecord?, promise: Promise) in
      #if YANDEX_MAPS_FULL
        self.retain(
          self.manager().submit(
            with: YMKPoint(latitude: point.latitude, longitude: point.longitude),
            zoom: options?.zoom.map { NSNumber(value: $0) },
            searchOptions: self.searchOptions(options)
          ) { response, error in self.handle(response, error, promise) })
      #else
        promise.reject("E_FULL_REQUIRED", Self.fullRequiredMessage)
      #endif
    }.runOnQueue(.main)
  }

  private static let fullRequiredMessage =
    "expo-yandex-mapkit: search requires the MapKit full flavor. "
    + "Set flavor: 'full' in the config plugin (and rebuild)."

  #if YANDEX_MAPS_FULL
    private func manager() -> YMKSearchManager {
      let manager = searchManager ?? YMKSearchFactory.instance().createSearchManager(with: .combined)
      searchManager = manager
      return manager
    }

    private func retain(_ session: YMKSearchSession) {
      sessions.append(session)
    }

    private func handle(_ response: YMKSearchResponse?, _ error: Error?, _ promise: Promise) {
      if let error = error {
        promise.reject(
          "E_SEARCH", "expo-yandex-mapkit: search failed — \(error.localizedDescription)")
        return
      }
      let items = (response?.collection.children ?? []).compactMap { $0.obj }.map { self.serialize($0) }
      promise.resolve(items)
    }

    private func resolveGeometry(_ options: SearchOptionsRecord?) -> YMKGeometry {
      if let sw = options?.boundingBox?.southWest, let ne = options?.boundingBox?.northEast {
        return YMKGeometry(
          boundingBox: YMKBoundingBox(
            southWest: YMKPoint(latitude: sw.latitude, longitude: sw.longitude),
            northEast: YMKPoint(latitude: ne.latitude, longitude: ne.longitude)))
      }
      if let up = options?.userPosition {
        return YMKGeometry(point: YMKPoint(latitude: up.latitude, longitude: up.longitude))
      }
      return YMKGeometry(
        boundingBox: YMKBoundingBox(
          southWest: YMKPoint(latitude: -90, longitude: -180),
          northEast: YMKPoint(latitude: 90, longitude: 180)))
    }

    private func searchOptions(_ options: SearchOptionsRecord?) -> YMKSearchOptions {
      let result = YMKSearchOptions()
      result.searchTypes = resolveSearchTypes(options?.searchTypes)
      if let up = options?.userPosition {
        result.userPosition = YMKPoint(latitude: up.latitude, longitude: up.longitude)
      }
      if let size = options?.resultPageSize {
        result.resultPageSize = NSNumber(value: size)
      }
      return result
    }

    private func resolveSearchTypes(_ types: [String]?) -> YMKSearchType {
      let list = types ?? ["geo"]
      var result: YMKSearchType = []
      for type in list {
        switch type {
        case "geo": result.insert(.geo)
        case "biz": result.insert(.biz)
        default: break
        }
      }
      return result.isEmpty ? [.geo] : result
    }

    private func serialize(_ obj: YMKGeoObject) -> [String: Any?] {
      var result: [String: Any?] = [:]
      if let name = obj.name {
        result["name"] = name
      }
      if let description = obj.descriptionText {
        result["description"] = description
      }
      let toponym =
        obj.metadataContainer.getItemOf(YMKSearchToponymObjectMetadata.self)
        as? YMKSearchToponymObjectMetadata
      if let point = toponym?.balloonPoint ?? obj.geometry.first?.point {
        result["point"] = ["latitude": point.latitude, "longitude": point.longitude]
      }
      // The structured Address components (with the 20 address kinds) are a follow-up slice; the
      // formatted string covers the common geocoding case.
      if let address = toponym?.address {
        result["formattedAddress"] = address.formattedAddress
      }
      return result
    }
  #endif
}
