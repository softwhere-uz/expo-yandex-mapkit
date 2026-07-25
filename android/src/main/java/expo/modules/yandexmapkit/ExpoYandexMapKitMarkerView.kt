package expo.modules.yandexmapkit

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.PointF
import android.view.View
import android.view.animation.LinearInterpolator
import com.yandex.mapkit.geometry.Point
import com.yandex.mapkit.map.ClusterizedPlacemarkCollection
import com.yandex.mapkit.map.IconStyle
import com.yandex.mapkit.map.MapObject
import com.yandex.mapkit.map.MapObjectCollection
import com.yandex.mapkit.map.MapObjectTapListener
import com.yandex.mapkit.map.PlacemarkMapObject
import com.yandex.mapkit.map.RotationType
import com.yandex.runtime.image.ImageProvider
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
  // icon. It takes precedence over `source`. The child is snapshotted to a Bitmap by hand rather
  // than through MapKit's ViewProvider: ViewProvider.snapshot() measures the view with UNSPECIFIED
  // specs, which a Fabric (new-architecture) ReactViewGroup rejects ("must have an explicit width
  // and height"), crashing the app. Drawing the already-laid-out child ourselves avoids that.
  private var tracksViewChanges = true
  private var childView: View? = null
  private var hasRenderedChild = false

  // Set by a <Clusterer> parent while this marker is clustered, so a geometry change re-triggers
  // clustering. Null when the marker is a direct child of the map (un-clustered).
  internal var onClusterInvalidate: (() -> Unit)? = null
  // Set by a <Clusterer> parent so a change to `excludeFromCluster` after attach re-routes this
  // marker between the cluster and root collections. Null when un-clustered.
  internal var onExclusionChanged: (() -> Unit)? = null
  // Whether this marker opts out of clustering. Read by the owning <Clusterer> to route the marker to
  // the map's root collection instead of the cluster collection. Its setter (not a separate
  // setExcludeFromCluster function — that would clash with the property's own JVM setter) re-routes
  // an already-attached marker when the flag flips; otherwise the clusterer's attach path reads it.
  internal var excludeFromCluster = false
    set(value) {
      if (value == field) {
        return
      }
      field = value
      if (placemark != null) {
        onExclusionChanged?.invoke()
      }
    }
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
    // A clustered marker moving must re-cluster; no-op when un-clustered.
    onClusterInvalidate?.invoke()
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
    bindPlacemark(collection.addPlacemark())
  }

  // Attach into a `<Clusterer>`'s cluster collection instead of the map's root collection, so this
  // marker participates in clustering. Mirrors attachToMap — a ClusterizedPlacemarkCollection is a
  // BaseMapObjectCollection, so addPlacemark() / remove() behave identically.
  internal fun attachToCluster(collection: ClusterizedPlacemarkCollection) {
    if (placemark != null) {
      return
    }
    bindPlacemark(collection.addPlacemark())
  }

  internal fun detachFromCluster(collection: ClusterizedPlacemarkCollection) {
    placemark?.let { collection.remove(it) }
    clearPlacemarkState()
  }

  // Wire a freshly created placemark (from either the root or a cluster collection) up to this view.
  private fun bindPlacemark(created: PlacemarkMapObject) {
    placemark = created
    // MapKit 4.41+ takes an explicit WeakReference; this view is the strong owner of the listener
    // and is itself kept alive by the map view's child list while mounted.
    created.addTapListener(WeakReference(this))
    appliedIconSource = null
    hasIcon = false
    updateMarker()
  }

  private fun clearPlacemarkState() {
    placemark = null
    appliedIconSource = null
    hasIcon = false
    hasRenderedChild = false
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
    clearPlacemarkState()
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

    // A React-children icon (custom pin) takes precedence over the image source. The ViewProvider
    // is created and the snapshot taken in refreshChildIcon once the child has been laid out — NOT
    // here: ViewProvider's constructor snapshots the view immediately, which measures it, and a
    // Fabric ReactViewGroup asserts ("must have an explicit width and height") until it has a real
    // measured size. On attach the child has none yet, so constructing it here crashed on mount.
    if (childView != null) {
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

  // Snapshot the child view to a bitmap and apply it as the placemark icon. No-op until the child
  // has a real size (its first Fabric layout pass) and the placemark exists. The child is already
  // measured and laid out by Fabric at this point, so we draw it directly onto a canvas — we do NOT
  // go through MapKit's ViewProvider (its snapshot() re-measures the view with UNSPECIFIED specs,
  // which a Fabric ReactViewGroup rejects, crashing the app on the new architecture).
  private fun refreshChildIcon() {
    val placemark = placemark ?: return
    val child = childView ?: return
    if (!placemark.isValid || child.width <= 0 || child.height <= 0) {
      return
    }
    val bitmap = Bitmap.createBitmap(child.width, child.height, Bitmap.Config.ARGB_8888)
    child.draw(Canvas(bitmap))
    placemark.setIcon(ImageProvider.fromBitmap(bitmap))
    placemark.setIconStyle(buildIconStyle())
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
