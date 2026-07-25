package expo.modules.yandexmapkit

import com.yandex.mapkit.GeoObject
import com.yandex.mapkit.geometry.BoundingBox
import com.yandex.mapkit.geometry.Geometry
import com.yandex.mapkit.geometry.Point
import com.yandex.mapkit.search.Response
import com.yandex.mapkit.search.SearchFactory
import com.yandex.mapkit.search.SearchManager
import com.yandex.mapkit.search.SearchManagerType
import com.yandex.mapkit.search.SearchOptions
import com.yandex.mapkit.search.SearchType
import com.yandex.mapkit.search.Session
import com.yandex.mapkit.search.ToponymObjectMetadata
import com.yandex.runtime.Error
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Full-flavor implementation of the Search module (text search + reverse geocoding). Compiled only
// under the `full` MapKit flavor (android/build.gradle picks src/mapkit/full); the lite flavor gets
// the rejecting stub from src/mapkit/lite. See [[v2-full-flavor-architecture]] for the split.
class ExpoYandexSearchModule : Module() {
  private var searchManager: SearchManager? = null

  override fun definition() = ModuleDefinition {
    Name("ExpoYandexSearch")

    // Text search near a geometry (a point / bounding box, else the whole world).
    AsyncFunction("searchText") { query: String, options: SearchOptionsRecord?, promise: Promise ->
      manager().submit(query, resolveGeometry(options), searchOptions(options), listener(promise))
    }.runOnQueue(Queues.MAIN)

    // Reverse geocoding: the objects at a coordinate.
    AsyncFunction("searchPoint") { point: PointRecord, options: SearchOptionsRecord?, promise: Promise ->
      manager().submit(
        Point(point.latitude, point.longitude),
        options?.zoom?.toInt(),
        searchOptions(options),
        listener(promise)
      )
    }.runOnQueue(Queues.MAIN)

    // Resolve a MapKit object URI (e.g. a `ymapsbm1://…` from a suggest result) to full details.
    AsyncFunction("resolveURI") { uri: String, options: SearchOptionsRecord?, promise: Promise ->
      manager().resolveURI(uri, searchOptions(options), listener(promise))
    }.runOnQueue(Queues.MAIN)
  }

  // MapKitFactory (main module initialize()/build-time key) is the prerequisite; SearchFactory has
  // no initialize() of its own.
  private fun manager(): SearchManager =
    searchManager
      ?: SearchFactory.getInstance().createSearchManager(SearchManagerType.COMBINED)
        .also { searchManager = it }

  private fun listener(promise: Promise) = object : Session.SearchListener {
    override fun onSearchResponse(response: Response) {
      promise.resolve(serialize(response))
    }

    override fun onSearchError(error: Error) {
      promise.reject("E_SEARCH", "expo-yandex-mapkit: search failed (${error.javaClass.simpleName})", null)
    }
  }

  private fun resolveGeometry(options: SearchOptionsRecord?): Geometry {
    val box = options?.boundingBox
    val sw = box?.southWest
    val ne = box?.northEast
    if (sw != null && ne != null) {
      return Geometry.fromBoundingBox(
        BoundingBox(Point(sw.latitude, sw.longitude), Point(ne.latitude, ne.longitude))
      )
    }
    options?.userPosition?.let { return Geometry.fromPoint(Point(it.latitude, it.longitude)) }
    return Geometry.fromBoundingBox(BoundingBox(Point(-90.0, -180.0), Point(90.0, 180.0)))
  }

  private fun searchOptions(options: SearchOptionsRecord?): SearchOptions {
    val result = SearchOptions().setSearchTypes(resolveSearchTypes(options?.searchTypes))
    options?.userPosition?.let { result.setUserPosition(Point(it.latitude, it.longitude)) }
    options?.resultPageSize?.let { result.setResultPageSize(it.toInt()) }
    return result
  }

  private fun resolveSearchTypes(types: List<String>?): Int {
    val list = types ?: listOf("geo")
    var result = 0
    for (type in list) {
      result = result or when (type) {
        "geo" -> SearchType.GEO.value
        "biz" -> SearchType.BIZ.value
        else -> 0
      }
    }
    return if (result == 0) SearchType.GEO.value else result
  }

  private fun serialize(response: Response): List<Map<String, Any?>> =
    response.collection.children.mapNotNull { item -> item.obj?.let { serializeGeoObject(it) } }

  private fun serializeGeoObject(obj: GeoObject): Map<String, Any?> {
    val result = mutableMapOf<String, Any?>()
    obj.name?.let { result["name"] = it }
    obj.descriptionText?.let { result["description"] = it }
    val toponym = obj.metadataContainer.getItem(ToponymObjectMetadata::class.java)
    val point = toponym?.balloonPoint ?: obj.geometry.firstOrNull()?.point
    point?.let { result["point"] = mapOf("latitude" to it.latitude, "longitude" to it.longitude) }
    toponym?.address?.let { address ->
      result["formattedAddress"] = address.formattedAddress
      result["addressComponents"] = address.components.map { component ->
        mapOf(
          "name" to component.name,
          // Kind enum name lowercased → snake_case (e.g. METRO_STATION → "metro_station"), matching iOS.
          "kinds" to component.kinds.map { kind -> kind.name.lowercase() }
        )
      }
    }
    return result
  }
}
