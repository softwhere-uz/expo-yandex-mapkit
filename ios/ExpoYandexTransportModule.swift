import ExpoModulesCore
#if YANDEX_MAPS_FULL
  import YandexMapsMobile
#endif

// The Transport (routing) module: driving, masstransit and pedestrian routes. Real work is behind
// `#if YANDEX_MAPS_FULL` (references classes the lite pod omits); in lite the call rejects clearly.
// This first slice returns each route's summary (time / distance / transfers) + geometry; the
// per-section transit breakdown is a follow-up. Reuses PointRecord from the map view module.
public class ExpoYandexTransportModule: Module {
  #if YANDEX_MAPS_FULL
    private var drivingRouter: YMKDrivingRouter?
    private var masstransitRouter: YMKMasstransitRouter?
    private var pedestrianRouter: YMKPedestrianRouter?
    // Sessions must be retained until their routes arrive — dropping one cancels the request.
    private var sessions: [Any] = []
  #endif

  public func definition() -> ModuleDefinition {
    Name("ExpoYandexTransport")

    AsyncFunction("findRoutes") { (points: [PointRecord], mode: String, promise: Promise) in
      #if YANDEX_MAPS_FULL
        let requestPoints = points.map {
          YMKRequestPoint(
            point: YMKPoint(latitude: $0.latitude, longitude: $0.longitude),
            type: .waypoint, pointContext: nil, drivingArrivalPointId: nil, indoorLevelId: nil)
        }
        switch mode {
        case "driving": self.requestDriving(requestPoints, promise)
        case "masstransit": self.requestMasstransit(requestPoints, promise)
        case "pedestrian": self.requestPedestrian(requestPoints, promise)
        default:
          promise.reject("E_ROUTE_MODE", "expo-yandex-mapkit: unknown route mode '\(mode)'")
        }
      #else
        promise.reject("E_FULL_REQUIRED", Self.fullRequiredMessage)
      #endif
    }.runOnQueue(.main)
  }

  private static let fullRequiredMessage =
    "expo-yandex-mapkit: routing requires the MapKit full flavor. "
    + "Set flavor: 'full' in the config plugin (and rebuild)."

  #if YANDEX_MAPS_FULL
    private func requestDriving(_ points: [YMKRequestPoint], _ promise: Promise) {
      let router =
        drivingRouter ?? YMKDirectionsFactory.instance().createDrivingRouter(withType: .combined)
      drivingRouter = router
      let session = router.requestRoutes(
        with: points,
        drivingOptions: YMKDrivingOptions(),
        vehicleOptions: YMKDrivingVehicleOptions()
      ) { routes, error in
        if let error = error {
          promise.reject("E_ROUTE", self.routeError(error))
          return
        }
        promise.resolve((routes ?? []).map { self.serializeDriving($0) })
      }
      sessions.append(session)
    }

    private func requestMasstransit(_ points: [YMKRequestPoint], _ promise: Promise) {
      let router = masstransitRouter ?? YMKTransportFactory.instance().createMasstransitRouter()
      masstransitRouter = router
      let session = router.requestRoutes(
        with: points,
        transitOptions: YMKTransitOptions(
          avoid: YMKFilterVehicleTypes(rawValue: 0), timeOptions: YMKTimeOptions()),
        routeOptions: YMKRouteOptions(
          fitnessOptions: YMKFitnessOptions(avoidSteep: false, avoidStairs: false))
      ) { routes, error in
        self.handleMasstransit(routes, error, promise)
      }
      sessions.append(session)
    }

    private func requestPedestrian(_ points: [YMKRequestPoint], _ promise: Promise) {
      let router = pedestrianRouter ?? YMKTransportFactory.instance().createPedestrianRouter()
      pedestrianRouter = router
      let session = router.requestRoutes(
        with: points,
        timeOptions: YMKTimeOptions(),
        routeOptions: YMKRouteOptions(
          fitnessOptions: YMKFitnessOptions(avoidSteep: false, avoidStairs: false))
      ) { routes, error in
        self.handleMasstransit(routes, error, promise)
      }
      sessions.append(session)
    }

    private func handleMasstransit(
      _ routes: [YMKMasstransitRoute]?, _ error: Error?, _ promise: Promise
    ) {
      if let error = error {
        promise.reject("E_ROUTE", routeError(error))
        return
      }
      promise.resolve((routes ?? []).map { serializeMasstransit($0) })
    }

    private func serializeDriving(_ route: YMKDrivingRoute) -> [String: Any?] {
      let weight = route.metadata.weight
      return [
        "time": weight.time.text,
        "timeWithTraffic": weight.timeWithTraffic.text,
        "distance": weight.distance.value,
        "points": route.geometry.points.map {
          ["latitude": $0.latitude, "longitude": $0.longitude]
        },
      ]
    }

    private func serializeMasstransit(_ route: YMKMasstransitRoute) -> [String: Any?] {
      let weight = route.metadata.weight
      return [
        "time": weight.time.text,
        "walkingDistance": weight.walkingDistance.value,
        "transfersCount": weight.transfersCount,
        "points": route.geometry.points.map {
          ["latitude": $0.latitude, "longitude": $0.longitude]
        },
      ]
    }

    private func routeError(_ error: Error) -> String {
      "expo-yandex-mapkit: route request failed — \(error.localizedDescription)"
    }
  #endif
}
