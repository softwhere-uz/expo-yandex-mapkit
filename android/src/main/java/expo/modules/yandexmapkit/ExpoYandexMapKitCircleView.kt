package expo.modules.yandexmapkit

import android.content.Context
import com.yandex.mapkit.geometry.Circle
import com.yandex.mapkit.geometry.Point
import com.yandex.mapkit.map.CircleMapObject
import com.yandex.mapkit.map.MapObject
import com.yandex.mapkit.map.MapObjectCollection
import com.yandex.mapkit.map.MapObjectTapListener
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.lang.ref.WeakReference

// One `<Circle>`. Drives a MapKit CircleMapObject; created lazily once the collection and a center
// are available. Radius is in meters.
class ExpoYandexMapKitCircleView(context: Context, appContext: AppContext) :
  ExpoView(context, appContext), MapObjectTapListener, MapObjectChild {
  private val onShapePress by EventDispatcher<Map<String, Any?>>()

  private var collection: MapObjectCollection? = null
  private var mapObject: CircleMapObject? = null
  private var center: Point? = null
  private var radius = 0f
  private var fillColor: Int? = null
  private var strokeColor: Int? = null
  private var strokeWidth: Float? = null
  private var zIndexValue = 0f
  private var handled = false

  internal fun setCenter(value: Point) {
    center = value
    updateGeometry()
  }

  internal fun setRadius(value: Float) {
    radius = value
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

  private fun createIfReady() {
    if (mapObject != null) {
      return
    }
    val collection = collection ?: return
    val center = center ?: return
    if (radius <= 0f) {
      return
    }
    val obj = collection.addCircle(Circle(center, radius))
    mapObject = obj
    obj.addTapListener(WeakReference(this))
    updateStyle()
  }

  private fun updateGeometry() {
    val obj = mapObject
    val center = center
    if (obj != null && obj.isValid && center != null && radius > 0f) {
      obj.geometry = Circle(center, radius)
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
    onShapePress(mapOf("point" to mapOf("latitude" to point.latitude, "longitude" to point.longitude)))
    return handled
  }
}
