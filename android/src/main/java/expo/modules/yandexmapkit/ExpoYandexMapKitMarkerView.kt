package expo.modules.yandexmapkit

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.PointF
import android.view.View
import android.view.animation.LinearInterpolator
import com.yandex.mapkit.geometry.Point
import com.yandex.mapkit.map.IconStyle
import com.yandex.mapkit.map.MapObject
import com.yandex.mapkit.map.MapObjectCollection
import com.yandex.mapkit.map.MapObjectTapListener
import com.yandex.mapkit.map.PlacemarkMapObject
import com.yandex.mapkit.map.RotationType
import com.yandex.runtime.image.ImageProvider
import com.yandex.runtime.ui_view.ViewProvider
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.lang.ref.WeakReference

// The `anchor` prop shape: icon anchor as [0,1] fractions of the icon size.
class MarkerAnchorRecord : Record {
  @Field
  var x: Double = 0.5

  @Field
  var y: Double = 1.0
}

// One `<Marker>`. It is an (invisible) ExpoView so React can mount it as a child of the map view;
// it owns no Android UI of its own — it drives a MapKit PlacemarkMapObject. The map view creates
// the placemark (from its MapObjectCollection) and hands it over via [attachTo]; this view then
// mirrors its props onto the placemark. Props may arrive before or after the placemark exists, so
// every setter re-applies through [updateMarker], which no-ops until both the placemark and a
// point are present.
class ExpoYandexMapKitMarkerView(context: Context, appContext: AppContext) :
  ExpoView(context, appContext), MapObjectTapListener, MapObjectChild {
  // Named onMarkerPress (not onPress): React Native normalizes onPress to the top-level bubbling
  // event topPress, which collides with Expo's direct-event registration ("Event cannot be both
  // direct and bubbling: topPress") and red-screens on the first marker mount. topMarkerPress is
  // free. The public JS prop stays `onPress` — the wrapper forwards it to this native event.
  private val onMarkerPress by EventDispatcher<Map<String, Any?>>()

  private var placemark: PlacemarkMapObject? = null
  private var point: Point? = null
  private var scale = 1f
  private var anchor: PointF? = null
  private var visible = true
  private var zIndexValue = 0f
  private var rotated = false
  private var handled = false
  private var identifier: String? = null
  private var iconSource: String? = null
  // The icon URI currently applied to the placemark; guards against reloading the same image on
  // every unrelated prop change (image loads are async and would otherwise thrash).
  private var appliedIconSource: String? = null
  // Whether an icon (image or view) has actually been set on the placemark yet. setIconStyle is
  // only meaningful once an icon exists (it does nothing / is unsupported otherwise), so style is
  // only applied after this flips true — mirrors the iOS assertion guard.
  private var hasIcon = false

  // React-children icon: the marker's content child (a custom pin) is rendered as the placemark
  // icon via MapKit's ViewProvider — more reliable than snapshotting to a bitmap by hand. It takes
  // precedence over `source`.
  private var tracksViewChanges = true
  private var childView: View? = null
  private var viewProvider: ViewProvider? = null
  private var hasRenderedChild = false
  // Re-render the icon when the child is (re)laid out: always for the first successful render, and
  // thereafter only while tracksViewChanges is on (so a settled bubble is snapshotted once).
  private val childLayoutListener = View.OnLayoutChangeListener { view, _, _, _, _, _, _, _, _ ->
    if (view.width > 0 && view.height > 0 && (tracksViewChanges || !hasRenderedChild)) {
      refreshChildIcon()
    }
  }

  internal fun setPoint(value: Point) {
    point = value
    updateMarker()
  }

  internal fun setScale(value: Float) {
    scale = value
    updateMarker()
  }

  internal fun setAnchor(value: MarkerAnchorRecord?) {
    anchor = value?.let {
      PointF(it.x.toFloat().coerceIn(0f, 1f), it.y.toFloat().coerceIn(0f, 1f))
    }
    updateMarker()
  }

  internal fun setVisible(value: Boolean) {
    visible = value
    updateMarker()
  }

  internal fun setZIndexValue(value: Float) {
    zIndexValue = value
    updateMarker()
  }

  internal fun setRotated(value: Boolean) {
    rotated = value
    updateMarker()
  }

  internal fun setHandled(value: Boolean) {
    handled = value
  }

  internal fun setIdentifier(value: String?) {
    identifier = value
  }

  internal fun setIconSource(value: String?) {
    iconSource = value
    updateMarker()
  }

  // Called by the map view once it has created a placemark for this marker (immediately when the
  // marker mounts onto a ready map, or later when the map finishes initializing).
  override fun attachToMap(collection: MapObjectCollection) {
    if (placemark != null) {
      return
    }
    val placemark = collection.addPlacemark()
    this.placemark = placemark
    // MapKit 4.41+ takes an explicit WeakReference; this view is the strong owner of the listener
    // and is itself kept alive by the map view's child list while mounted.
    placemark.addTapListener(WeakReference(this))
    appliedIconSource = null
    hasIcon = false
    updateMarker()
  }

  internal fun setTracksViewChanges(value: Boolean) {
    tracksViewChanges = value
    // Turning tracking back on forces a fresh snapshot of whatever the child currently shows.
    if (value) {
      refreshChildIcon()
    }
  }

  // The marker's React children (a custom pin) arrive as normal child views. Track the first one
  // and render it as the icon.
  override fun onViewAdded(child: View) {
    super.onViewAdded(child)
    if (childView == null) {
      childView = child
      viewProvider = null
      hasRenderedChild = false
      child.addOnLayoutChangeListener(childLayoutListener)
      updateMarker()
    }
  }

  override fun onViewRemoved(child: View) {
    super.onViewRemoved(child)
    if (child === childView) {
      child.removeOnLayoutChangeListener(childLayoutListener)
      childView = null
      viewProvider = null
      hasRenderedChild = false
      // Fall back to the image `source` now that the custom view is gone. Clear hasIcon so a
      // style-only update doesn't run before the source icon has (re)loaded.
      appliedIconSource = null
      hasIcon = false
      updateMarker()
    }
  }

  override fun detachFromMap(collection: MapObjectCollection) {
    placemark?.let { collection.remove(it) }
    placemark = null
    appliedIconSource = null
    hasIcon = false
    viewProvider = null
    hasRenderedChild = false
  }

  override val isAttachedToMap: Boolean
    get() = placemark != null

  // The marker's current geographic position, for fitAllMarkers().
  internal fun geoPoint(): Point? = point

  private fun updateMarker() {
    val placemark = placemark ?: return
    if (!placemark.isValid) {
      return
    }
    val point = point ?: return
    placemark.geometry = point
    placemark.zIndex = zIndexValue

    // A React-children icon (custom pin) takes precedence over the image source. The actual
    // snapshot happens in refreshChildIcon once the child has been laid out (childLayoutListener),
    // where setView sets both the icon and its style together.
    val child = childView
    if (child != null) {
      if (viewProvider == null) {
        viewProvider = ViewProvider(child)
      }
      refreshChildIcon()
      return
    }

    val source = iconSource
    if (source.isNullOrEmpty()) {
      // No icon source: only (re)apply style if an icon is already present — never style an
      // icon-less placemark. Nothing to render otherwise.
      if (hasIcon) {
        placemark.setIconStyle(buildIconStyle())
      }
      return
    }
    if (source == appliedIconSource) {
      // Same icon already applied (or still loading). Re-apply style for scale/anchor/visibility
      // changes, but only once the icon is actually on the placemark.
      if (hasIcon) {
        placemark.setIconStyle(buildIconStyle())
      }
      return
    }
    appliedIconSource = source
    MarkerImageLoader.load(context, source) { bitmap ->
      val current = this.placemark
      // Ignore a late load if the marker was detached or the icon changed again meanwhile.
      if (bitmap != null && current != null && current.isValid && source == appliedIconSource) {
        current.setIcon(ImageProvider.fromBitmap(bitmap))
        hasIcon = true
        // Apply the style now that an icon exists (scale/anchor/visibility/rotation).
        current.setIconStyle(buildIconStyle())
      }
    }
  }

  // Snapshot the child view and apply it as the placemark icon. No-op until the child has a real
  // size (its first layout pass) and the placemark exists.
  private fun refreshChildIcon() {
    val placemark = placemark ?: return
    val provider = viewProvider ?: return
    val child = childView ?: return
    if (!placemark.isValid || child.width <= 0 || child.height <= 0) {
      return
    }
    provider.snapshot()
    placemark.setView(provider, buildIconStyle())
    hasIcon = true
    hasRenderedChild = true
  }

  private fun buildIconStyle(): IconStyle {
    val iconStyle = IconStyle()
    iconStyle.scale = scale
    iconStyle.rotationType = if (rotated) RotationType.ROTATE else RotationType.NO_ROTATION
    iconStyle.visible = visible
    anchor?.let { iconStyle.anchor = it }
    return iconStyle
  }

  override fun onMapObjectTap(mapObject: MapObject, point: Point): Boolean {
    onMarkerPress(
      mapOf(
        "identifier" to identifier,
        "point" to mapOf("latitude" to point.latitude, "longitude" to point.longitude)
      )
    )
    // Returning true consumes the tap so it does not also fall through to the map's onMapPress.
    return handled
  }

  // Imperative animations, invoked via the marker's view ref. Linear tween of the placemark's
  // geometry / heading; no-op if the placemark is not on the map yet.
  internal fun animatedMoveTo(target: Point, durationMs: Double) {
    val placemark = placemark ?: return
    if (!placemark.isValid) {
      return
    }
    val start = placemark.geometry
    val deltaLat = target.latitude - start.latitude
    val deltaLon = target.longitude - start.longitude
    ValueAnimator.ofFloat(0f, 1f).apply {
      duration = durationMs.toLong().coerceAtLeast(0L)
      interpolator = LinearInterpolator()
      addUpdateListener { animation ->
        val current = this@ExpoYandexMapKitMarkerView.placemark
        if (current != null && current.isValid) {
          val fraction = animation.animatedFraction
          current.geometry = Point(start.latitude + fraction * deltaLat, start.longitude + fraction * deltaLon)
        }
      }
      start()
    }
  }

  internal fun animatedRotateTo(angle: Float, durationMs: Double) {
    val placemark = placemark ?: return
    if (!placemark.isValid) {
      return
    }
    val startDirection = placemark.direction
    val delta = angle - startDirection
    ValueAnimator.ofFloat(0f, 1f).apply {
      duration = durationMs.toLong().coerceAtLeast(0L)
      interpolator = LinearInterpolator()
      addUpdateListener { animation ->
        val current = this@ExpoYandexMapKitMarkerView.placemark
        if (current != null && current.isValid) {
          current.direction = startDirection + animation.animatedFraction * delta
        }
      }
      start()
    }
  }
}
