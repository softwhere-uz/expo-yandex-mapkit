package expo.modules.yandexmapkit

import com.yandex.mapkit.geometry.BoundingBox
import com.yandex.mapkit.geometry.Point
import com.yandex.mapkit.search.SearchFactory
import com.yandex.mapkit.search.SearchManager
import com.yandex.mapkit.search.SearchManagerType
import com.yandex.mapkit.search.SuggestItem
import com.yandex.mapkit.search.SuggestOptions
import com.yandex.mapkit.search.SuggestResponse
import com.yandex.mapkit.search.SuggestSession
import com.yandex.mapkit.search.SuggestType
import com.yandex.runtime.Error
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Full-flavor implementation of the Suggest module (search-as-you-type). Compiled only when the
// `full` MapKit flavor is selected (android/build.gradle picks src/mapkit/full); the lite flavor
// gets the rejecting stub of this same class from src/mapkit/lite. Each item's `center` coordinate
// is read natively (MapKit >= 4.3.0) so results carry coordinates directly — the recurring bug in
// this lineage (yamap-plus#27) came from re-parsing the URI in JS instead.
class ExpoYandexSuggestModule : Module() {
  private var searchManager: SearchManager? = null
  private var suggestSession: SuggestSession? = null

  override fun definition() = ModuleDefinition {
    Name("ExpoYandexSuggest")

    AsyncFunction("suggest") { query: String, options: SuggestOptionsRecord?, promise: Promise ->
      val session = ensureSession()
      val suggestOptions = SuggestOptions()
        .setSuggestTypes(resolveSuggestTypes(options?.types))
        .setSuggestWords(options?.suggestWords ?: true)
      options?.userPosition?.let { suggestOptions.setUserPosition(Point(it.latitude, it.longitude)) }
      session.suggest(
        query,
        resolveWindow(options?.boundingBox),
        suggestOptions,
        object : SuggestSession.SuggestListener {
          override fun onResponse(response: SuggestResponse) {
            promise.resolve(response.items.map { serialize(it) })
          }

          override fun onError(error: Error) {
            promise.reject(
              "E_SUGGEST",
              "expo-yandex-mapkit: suggest failed (${error.javaClass.simpleName})",
              null
            )
          }
        }
      )
    }.runOnQueue(Queues.MAIN)

    Function("reset") {
      suggestSession?.reset()
    }
  }

  // Create (once) the search manager + suggest session. SearchFactory has no initialize() — the map
  // subsystem is brought up by the main module's initialize()/build-time key (MapKitFactory), which
  // is a prerequisite; a call before that fails at runtime.
  private fun ensureSession(): SuggestSession {
    val manager = searchManager
      ?: SearchFactory.getInstance().createSearchManager(SearchManagerType.COMBINED)
        .also { searchManager = it }
    return suggestSession ?: manager.createSuggestSession().also { suggestSession = it }
  }

  private fun resolveSuggestTypes(types: List<String>?): Int {
    val list = types ?: listOf("geo", "biz", "transit")
    var result = 0
    for (type in list) {
      result = result or when (type) {
        "geo" -> SuggestType.GEO.value
        "biz" -> SuggestType.BIZ.value
        "transit" -> SuggestType.TRANSIT.value
        else -> 0
      }
    }
    return if (result == 0) {
      SuggestType.GEO.value or SuggestType.BIZ.value or SuggestType.TRANSIT.value
    } else {
      result
    }
  }

  // The suggest API requires a window; use the supplied bounding box or a world-spanning default.
  private fun resolveWindow(box: SuggestBoundingBoxRecord?): BoundingBox {
    val sw = box?.southWest
    val ne = box?.northEast
    if (sw != null && ne != null) {
      return BoundingBox(Point(sw.latitude, sw.longitude), Point(ne.latitude, ne.longitude))
    }
    return BoundingBox(Point(-90.0, -180.0), Point(90.0, 180.0))
  }

  private fun serialize(item: SuggestItem): Map<String, Any?> {
    val result = mutableMapOf<String, Any?>(
      "title" to item.title.text,
      "searchText" to item.searchText
    )
    item.subtitle?.let { result["subtitle"] = it.text }
    item.uri?.let { result["uri"] = it }
    item.distance?.let { result["distance"] = it.text }
    item.center?.let {
      result["center"] = mapOf("latitude" to it.latitude, "longitude" to it.longitude)
    }
    // The result item's kind (distinct from the request `types` filter): what the suggestion is.
    result["type"] = when (item.type) {
      SuggestItem.Type.TOPONYM -> "toponym"
      SuggestItem.Type.BUSINESS -> "business"
      SuggestItem.Type.TRANSIT -> "transit"
      SuggestItem.Type.LINK -> "link"
      SuggestItem.Type.UNKNOWN -> "unknown"
    }
    if (item.tags.isNotEmpty()) {
      result["tags"] = item.tags
    }
    return result
  }
}
