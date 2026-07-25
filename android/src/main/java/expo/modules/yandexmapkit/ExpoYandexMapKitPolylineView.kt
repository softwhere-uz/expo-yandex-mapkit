package expo.modules.yandexmapkit

import android.content.Context
import com.yandex.mapkit.geometry.Point
import com.yandex.mapkit.geometry.Polyline
import com.yandex.mapkit.map.LineStyle
import com.yandex.mapkit.map.MapObject
import com.yandex.mapkit.map.MapObjectCollection
import com.yandex.mapkit.map.MapObjectTapListener
import com.yandex.mapkit.map.PolylineMapObject
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.lang.ref.WeakReference

// One `<Polyline>`. An (invisible) ExpoView React mounts as a child of the map view; it drives a
// MapKit PolylineMapObject. Because a polyline can only be created with its geometry, the object is
// created lazily once both the map collection and at least two points are available — mirroring how
// the map hands markers their placemark.
class ExpoYandexMapKitPolylineView(context: Context, appContext: AppContext) :
  ExpoView(context, appContext), MapObjectTapListener, MapObjectChild {
  private val onPress by EventDispatcher<Map<String, Any?>>()

  private var collection: MapObjectCollection? = null
  private var mapObject: PolylineMapObject? = null
  private var points: List<Point> = emptyList()
  private var strokeColor: Int? = null
  private var strokeWidth: Float? = null
  private var outlineColor: Int? = null
  private var outlineWidth: Float? = null
  private var dashLength: Float? = null
  private var dashOffset: Float? = null
  private var gapLength: Float? = null
  private var zIndexValue = 0f
  private var handled = false

  internal fun setPoints(value: List<Point>) {
    points = value
    val obj = mapObject
    if (obj != null && obj.isValid && value.size >= 2) {
      obj.geometry = Polyline(value)
    } else {
      createIfReady()
    }
  }

  internal fun setStrokeColor(value: Int?) {
    strokeColor = value
    updateStyle()
  }

  internal fun setStrokeWidth(value: Float) {
    strokeWidth = value
    updateStyle()
  }

  internal fun setOutlineColor(value: Int?) {
    outlineColor = value
    updateStyle()
  }

  internal fun setOutlineWidth(value: Float) {
    outlineWidth = value
    updateStyle()
  }

  internal fun setDashLength(value: Float) {
    dashLength = value
    updateStyle()
  }

  internal fun setDashOffset(value: Float) {
    dashOffset = value
    updateStyle()
  }

  internal fun setGapLength(value: Float) {
    gapLength = value
    updateStyle()
  }

  internal fun setZIndexValue(value: Float) {
    zIndexValue = value
    updateStyle()
  }

  internal fun setHandled(value: Boolean) {
    handled = value
  }

  override fun attachToMap(collection: MapObjectCollection) {
    this.collection = collection
    createIfReady()
  }

  override fun detachFromMap(collection: MapObjectCollection) {
    mapObject?.let { collection.remove(it) }
    mapObject = null
    this.collection = null
  }

  // Attached once the map has handed over its collection, even if the geometry arrives later.
  override val isAttachedToMap: Boolean
    get() = collection != null

  private fun createIfReady() {
    if (mapObject != null) {
      return
    }
    val collection = collection ?: return
    if (points.size < 2) {
      return
    }
    val obj = collection.addPolyline(Polyline(points))
    mapObject = obj
    obj.addTapListener(WeakReference(this))
    updateStyle()
  }

  private fun updateStyle() {
    val obj = mapObject ?: return
    if (!obj.isValid) {
      return
    }
    obj.zIndex = zIndexValue
    obj.geometry = Polyline(points)
    strokeColor?.let { obj.setStrokeColor(it) }
    // Width / dash / outline are configured through a LineStyle (not direct properties).
    val style = LineStyle()
    strokeWidth?.let { style.strokeWidth = it }
    dashLength?.let { style.dashLength = it }
    gapLength?.let { style.gapLength = it }
    dashOffset?.let { style.dashOffset = it }
    outlineColor?.let { style.outlineColor = it }
    outlineWidth?.let { style.outlineWidth = it }
    obj.style = style
  }

  override fun onMapObjectTap(mapObject: MapObject, point: Point): Boolean {
    onPress(mapOf("point" to mapOf("latitude" to point.latitude, "longitude" to point.longitude)))
    return handled
  }
}
