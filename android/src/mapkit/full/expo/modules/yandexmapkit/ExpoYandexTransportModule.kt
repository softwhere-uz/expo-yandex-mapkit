package expo.modules.yandexmapkit

import com.yandex.mapkit.RequestPoint
import com.yandex.mapkit.RequestPointType
import com.yandex.mapkit.directions.DirectionsFactory
import com.yandex.mapkit.directions.driving.AvoidanceFlags
import com.yandex.mapkit.directions.driving.DrivingOptions
import com.yandex.mapkit.directions.driving.DrivingRoute
import com.yandex.mapkit.directions.driving.DrivingRouter
import com.yandex.mapkit.directions.driving.DrivingRouterType
import com.yandex.mapkit.directions.driving.DrivingSession
import com.yandex.mapkit.directions.driving.VehicleOptions
import com.yandex.mapkit.directions.driving.VehicleType
import com.yandex.mapkit.geometry.Point
import com.yandex.mapkit.geometry.SubpolylineHelper
import com.yandex.mapkit.transport.TransportFactory
import com.yandex.mapkit.transport.bicycle.BicycleRouter
import com.yandex.mapkit.transport.bicycle.VehicleType as BicycleVehicleType
import com.yandex.mapkit.transport.masstransit.FitnessOptions
import com.yandex.mapkit.transport.masstransit.MasstransitRouter
import com.yandex.mapkit.transport.masstransit.PedestrianRouter
import com.yandex.mapkit.transport.masstransit.Route
import com.yandex.mapkit.transport.masstransit.RouteOptions
import com.yandex.mapkit.transport.masstransit.Session
import com.yandex.mapkit.transport.masstransit.TimeOptions
import com.yandex.mapkit.transport.masstransit.TransitOptions
import com.yandex.runtime.Error
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Full-flavor implementation of the Transport (routing) module: driving, masstransit and pedestrian
// routes. Compiled only under the `full` MapKit flavor (android/build.gradle picks src/mapkit/full);
// lite gets the rejecting stub. See [[v2-full-flavor-architecture]]. This first slice returns each
// route's summary (time / distance / transfers) + full geometry; the per-section transit breakdown
// (which line, stops, per-leg mode) is a follow-up.
class ExpoYandexTransportModule : Module() {
  private var drivingRouter: DrivingRouter? = null
  private var masstransitRouter: MasstransitRouter? = null
  private var pedestrianRouter: PedestrianRouter? = null
  private var bicycleRouter: BicycleRouter? = null
  // Sessions must be retained until their routes arrive (dropping one cancels the request).
  private val sessions = mutableListOf<Any>()

  override fun definition() = ModuleDefinition {
    Name("ExpoYandexTransport")

    AsyncFunction("findRoutes") { points: List<PointRecord>, mode: String, options: DrivingRouteOptionsRecord?, promise: Promise ->
      val requestPoints = points.map {
        RequestPoint(Point(it.latitude, it.longitude), RequestPointType.WAYPOINT, null, null, null)
      }
      when (mode) {
        "driving" -> requestDriving(requestPoints, options, promise)
        "masstransit" -> requestMasstransit(requestPoints, promise)
        "pedestrian" -> requestPedestrian(requestPoints, promise)
        "bicycle" -> requestBicycle(requestPoints, BicycleVehicleType.BICYCLE, promise)
        "scooter" -> requestBicycle(requestPoints, BicycleVehicleType.SCOOTER, promise)
        else -> promise.reject("E_ROUTE_MODE", "expo-yandex-mapkit: unknown route mode '$mode'", null)
      }
    }.runOnQueue(Queues.MAIN)
  }

  private fun requestDriving(
    points: List<RequestPoint>,
    options: DrivingRouteOptionsRecord?,
    promise: Promise
  ) {
    val router = drivingRouter
      ?: DirectionsFactory.getInstance().createDrivingRouter(DrivingRouterType.COMBINED)
        .also { drivingRouter = it }
    val drivingOptions = DrivingOptions()
    val vehicleOptions = VehicleOptions()
    options?.let { opts ->
      // AvoidanceFlags constructor order: tolls, unpaved, poorCondition, railwayCrossing, boatFerry,
      // fordCrossing, tunnel, highway — we only expose the four common ones.
      drivingOptions.setAvoidanceFlags(
        AvoidanceFlags(
          opts.avoidTolls, opts.avoidUnpaved, opts.avoidPoorConditions,
          false, false, false, false, opts.avoidHighways
        )
      )
      opts.departureTime?.let { drivingOptions.setDepartureTime(it.toLong()) }
      opts.vehicleType?.let { vt ->
        vehicleOptions.setVehicleType(
          when (vt) {
            "taxi" -> VehicleType.TAXI
            "truck" -> VehicleType.TRUCK
            "moto" -> VehicleType.MOTO
            else -> VehicleType.DEFAULT
          }
        )
      }
    }
    sessions.add(
      router.requestRoutes(
        points,
        drivingOptions,
        vehicleOptions,
        object : DrivingSession.DrivingRouteListener {
          override fun onDrivingRoutes(routes: MutableList<DrivingRoute>) {
            promise.resolve(routes.map { serializeDriving(it) })
          }

          override fun onDrivingRoutesError(error: Error) {
            promise.reject("E_ROUTE", routeError(error), null)
          }
        }
      )
    )
  }

  private fun requestMasstransit(points: List<RequestPoint>, promise: Promise) {
    val router = masstransitRouter
      ?: TransportFactory.getInstance().createMasstransitRouter().also { masstransitRouter = it }
    sessions.add(
      router.requestRoutes(
        points,
        // avoid = 0 (no vehicle-type filter); a bare TimeOptions() means "depart now".
        TransitOptions(0, TimeOptions()),
        RouteOptions(FitnessOptions(false, false)),
        transitListener(promise)
      )
    )
  }

  private fun requestPedestrian(points: List<RequestPoint>, promise: Promise) {
    val router = pedestrianRouter
      ?: TransportFactory.getInstance().createPedestrianRouter().also { pedestrianRouter = it }
    sessions.add(
      router.requestRoutes(
        points,
        TimeOptions(),
        RouteOptions(FitnessOptions(false, false)),
        transitListener(promise)
      )
    )
  }

  // Bicycle / scooter routing (BicycleRouter with a VehicleType). Its Route carries a single
  // continuous leg — no transit sections — so `sections` is empty and the summary + geometry carry it.
  private fun requestBicycle(
    points: List<RequestPoint>,
    vehicleType: BicycleVehicleType,
    promise: Promise
  ) {
    val router = bicycleRouter
      ?: TransportFactory.getInstance().createBicycleRouter().also { bicycleRouter = it }
    sessions.add(
      router.requestRoutes(
        points,
        vehicleType,
        object : com.yandex.mapkit.transport.bicycle.Session.RouteListener {
          override fun onBicycleRoutes(
            routes: MutableList<com.yandex.mapkit.transport.bicycle.Route>
          ) {
            promise.resolve(routes.map { serializeBicycle(it) })
          }

          override fun onBicycleRoutesError(error: Error) {
            promise.reject("E_ROUTE", routeError(error), null)
          }
        }
      )
    )
  }

  private fun serializeBicycle(
    route: com.yandex.mapkit.transport.bicycle.Route
  ): Map<String, Any?> = mapOf(
    "time" to route.weight.time.text,
    "distance" to route.weight.distance.value,
    "points" to geometryPoints(route.geometry.points),
    "sections" to emptyList<Map<String, Any?>>()
  )

  private fun transitListener(promise: Promise) = object : Session.RouteListener {
    override fun onMasstransitRoutes(routes: MutableList<Route>) {
      promise.resolve(routes.map { serializeMasstransit(it) })
    }

    override fun onMasstransitRoutesError(error: Error) {
      promise.reject("E_ROUTE", routeError(error), null)
    }
  }

  private fun serializeDriving(route: DrivingRoute): Map<String, Any?> {
    val weight = route.metadata.weight
    return mapOf(
      "time" to weight.time.text,
      "timeWithTraffic" to weight.timeWithTraffic.text,
      "distance" to weight.distance.value,
      "points" to geometryPoints(route.geometry.points),
      "sections" to route.sections.map { section ->
        mapOf(
          "type" to "car",
          "time" to section.metadata.weight.time.text,
          "points" to geometryPoints(sectionPoints(route.geometry, section.geometry))
        )
      }
    )
  }

  private fun serializeMasstransit(route: Route): Map<String, Any?> {
    val weight = route.metadata.weight
    return mapOf(
      "time" to weight.time.text,
      "walkingDistance" to weight.walkingDistance.value,
      "transfersCount" to weight.transfersCount,
      "points" to geometryPoints(route.geometry.points),
      "sections" to route.sections.map { section -> serializeSection(route, section) }
    )
  }

  private fun serializeSection(route: Route, section: com.yandex.mapkit.transport.masstransit.Section): Map<String, Any?> {
    val result = mutableMapOf<String, Any?>(
      "time" to section.metadata.weight.time.text,
      "points" to geometryPoints(sectionPoints(route.geometry, section.geometry))
    )
    val transports = section.metadata.data.transports
    if (!transports.isNullOrEmpty()) {
      // A transit leg (bus / metro / …). Group each vehicle type to the line names serving it.
      val byType = mutableMapOf<String, MutableList<String>>()
      for (transport in transports) {
        for (vehicleType in transport.line.vehicleTypes) {
          byType.getOrPut(vehicleType) { mutableListOf() }.add(transport.line.name)
        }
      }
      result["type"] = transports.first().line.vehicleTypes.firstOrNull() ?: "transit"
      result["transports"] = byType
    } else {
      // No transports → a walking leg (or a zero-length waiting leg).
      result["type"] = if (section.metadata.weight.walkingDistance.value > 0) "walk" else "waiting"
    }
    return result
  }

  // A section's geometry is a fragment (Subpolyline) of the route's full polyline; resolve it to points.
  private fun sectionPoints(routeGeometry: com.yandex.mapkit.geometry.Polyline, subpolyline: com.yandex.mapkit.geometry.Subpolyline): List<Point> =
    SubpolylineHelper.subpolyline(routeGeometry, subpolyline).points

  private fun geometryPoints(points: List<Point>): List<Map<String, Double>> =
    points.map { mapOf("latitude" to it.latitude, "longitude" to it.longitude) }

  private fun routeError(error: Error): String =
    "expo-yandex-mapkit: route request failed (${error.javaClass.simpleName})"
}
