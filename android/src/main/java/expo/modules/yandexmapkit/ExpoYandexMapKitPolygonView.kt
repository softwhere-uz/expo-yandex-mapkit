package expo.modules.yandexmapkit

import android.content.Context
import com.yandex.mapkit.geometry.LinearRing
import com.yandex.mapkit.geometry.Point
import com.yandex.mapkit.geometry.Polygon
import com.yandex.mapkit.map.MapObject
import com.yandex.mapkit.map.MapObjectCollection
import com.yandex.mapkit.map.MapObjectTapListener
import com.yandex.mapkit.map.PolygonMapObject
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.lang.ref.WeakReference

// One `<Polygon>`. Drives a MapKit PolygonMapObject; created lazily once the collection and an
// outer ring of at least three points are available.
class ExpoYandexMapKitPolygonView(context: Context, appContext: AppContext) :
  ExpoView(context, appContext), MapObjectTapListener, MapObjectChild {
  private val onPress by EventDispatcher<Map<String, Any?>>()

  private var collection: MapObjectCollection? = null
  private var mapObject: PolygonMapObject? = null
  private var points: List<Point> = emptyList()
  private var innerRings: List<List<Point>> = emptyList()
  private var fillColor: Int? = null
  private var strokeColor: Int? = null
  private var strokeWidth: Float? = null
  private var zIndexValue = 0f
  private var handled = false

  internal fun setPoints(value: List<Point>) {
    points = value
    updateGeometry()
  }

  internal fun setInnerRings(value: List<List<Point>>) {
    innerRings = value
    updateGeometry()
  }

  internal fun setFillColor(value: Int?) {
    fillColor = value
    updateStyle()
  }

  internal fun setStrokeColor(value: Int?) {
    strokeColor = value
    updateStyle()
  }

  internal fun setStrokeWidth(value: Float) {
    strokeWidth = value
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

  override val isAttachedToMap: Boolean
    get() = collection != null

  private fun buildPolygon() = Polygon(LinearRing(points), innerRings.map { LinearRing(it) })

  private fun createIfReady() {
    if (mapObject != null) {
      return
    }
    val collection = collection ?: return
    if (points.size < 3) {
      return
    }
    val obj = collection.addPolygon(buildPolygon())
    mapObject = obj
    obj.addTapListener(WeakReference(this))
    updateStyle()
  }

  private fun updateGeometry() {
    val obj = mapObject
    if (obj != null && obj.isValid && points.size >= 3) {
      obj.geometry = buildPolygon()
    } else {
      createIfReady()
    }
  }

  private fun updateStyle() {
    val obj = mapObject ?: return
    if (!obj.isValid) {
      return
    }
    obj.zIndex = zIndexValue
    strokeWidth?.let { obj.strokeWidth = it }
    strokeColor?.let { obj.strokeColor = it }
    fillColor?.let { obj.fillColor = it }
  }

  override fun onMapObjectTap(mapObject: MapObject, point: Point): Boolean {
    onPress(mapOf("point" to mapOf("latitude" to point.latitude, "longitude" to point.longitude)))
    return handled
  }
}
