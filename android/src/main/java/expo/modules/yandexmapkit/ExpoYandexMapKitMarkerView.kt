package expo.modules.yandexmapkit

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.PointF
import android.view.View
import android.view.ViewGroup
import android.view.animation.LinearInterpolator
import com.yandex.mapkit.geometry.Point
import com.yandex.mapkit.map.ClusterizedPlacemarkCollection
import com.yandex.mapkit.map.IconStyle
import com.yandex.mapkit.map.MapObject
import com.yandex.mapkit.map.MapObjectCollection
import com.yandex.mapkit.map.MapObjectDragListener
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
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

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
  ExpoView(context, appContext), MapObjectTapListener, MapObjectDragListener, MapObjectChild {
  // Named onMarkerPress (not onPress): React Native normalizes onPress to the top-level bubbling
  // event topPress, which collides with Expo's direct-event registration ("Event cannot be both
  // direct and bubbling: topPress") and red-screens on the first marker mount. topMarkerPress is
  // free. The public JS prop stays `onPress` — the wrapper forwards it to this native event.
  private val onMarkerPress by EventDispatcher<Map<String, Any?>>()
  // Drag events use onMarker* native names (like onMarkerPress) to avoid RN's reserved bubbling names.
  private val onMarkerDragStart by EventDispatcher<Map<String, Any?>>()
  private val onMarkerDrag by EventDispatcher<Map<String, Any?>>()
  private val onMarkerDragEnd by EventDispatcher<Map<String, Any?>>()

  private var placemark: PlacemarkMapObject? = null
  private var point: Point? = null
  private var scale = 1f
  private var anchor: PointF? = null
  private var visible = true
  private var zIndexValue = 0f
  private var rotated = false
  private var handled = false
  private var identifier: String? = null
  private var draggable = false
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
  // The last bitmap applied as the child icon. Re-setting an icon is NOT a harmless no-op:
  // MapKit visibly displaces a placemark whose icon is swapped while the camera is moving
  // (issue #67 — markers drifted off their coordinate during pinch-zoom whenever any prop
  // update re-ran refreshChildIcon). Kept to skip setIcon when the pixels are unchanged.
  private var lastChildSnapshot: Bitmap? = null
  // Serial for explicit ImageProvider image IDs. fromBitmap(bitmap)'s auto-generated ID can
  // collide across successive snapshots (freed bitmap memory gets reused), making MapKit serve a
  // stale cached image with the OLD bitmap's dimensions — rendered as the pin pinned to the wrong
  // screen position after zooming (issue #67). A unique ID per distinct snapshot sidesteps the
  // collision; the sameAs() dedup above keeps IDs stable while the content is unchanged.
  private var snapshotSerial = 0

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

  internal fun setDraggable(value: Boolean) {
    draggable = value
    placemark?.let { if (it.isValid) it.isDraggable = value }
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
    created.setDragListener(WeakReference(this))
    created.isDraggable = draggable
    appliedIconSource = null
    hasIcon = false
    updateMarker()
  }

  private fun clearPlacemarkState() {
    placemark = null
    appliedIconSource = null
    hasIcon = false
    hasRenderedChild = false
    lastChildSnapshot = null
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
      lastChildSnapshot = null
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
      if (tracksViewChanges || !hasRenderedChild) {
        refreshChildIcon()
      } else if (hasIcon) {
        // Snapshot-once marker (tracksViewChanges=false, already rendered): geometry/zIndex were
        // applied above; re-apply only the style so scale/anchor/visibility changes still land.
        // Never re-snapshot here — apps that update a marker prop on every camera frame would
        // otherwise re-set the icon mid-gesture, which MapKit renders as the placemark drifting
        // off its coordinate while zooming (issue #67).
        placemark.setIconStyle(buildIconStyle())
      }
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
    // Snapshot the tight bounding box of the wrapper's children, not the wrapper's own bounds:
    // Fabric re-lays the marker's child wrapper out at the map's FULL WIDTH on commits after the
    // first (the pin content stays at its left edge). Snapshotting the stretched wrapper put the
    // pin far left of the icon's anchor point, which renders as the marker sliding off its
    // coordinate as soon as anything re-snapshots — the drift reported in issue #67.
    var cropLeft = 0
    var cropTop = 0
    var cropRight = child.width
    var cropBottom = child.height
    if (child is ViewGroup && child.childCount > 0) {
      cropLeft = Int.MAX_VALUE
      cropTop = Int.MAX_VALUE
      cropRight = 0
      cropBottom = 0
      for (i in 0 until child.childCount) {
        val inner = child.getChildAt(i)
        cropLeft = minOf(cropLeft, inner.left)
        cropTop = minOf(cropTop, inner.top)
        cropRight = maxOf(cropRight, inner.right)
        cropBottom = maxOf(cropBottom, inner.bottom)
      }
    }
    val width = cropRight - cropLeft
    val height = cropBottom - cropTop
    if (width <= 0 || height <= 0) {
      return
    }
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    canvas.translate(-cropLeft.toFloat(), -cropTop.toFloat())
    child.draw(canvas)
    // Only swap the icon when the pixels actually changed (covers tracksViewChanges=true markers
    // whose props update every camera frame): re-setting even an identical icon makes MapKit
    // displace the placemark while the camera is moving (issue #67).
    if (lastChildSnapshot?.sameAs(bitmap) != true) {
      val imageId = "expo-yandex-marker-${System.identityHashCode(this)}-${snapshotSerial++}"
      placemark.setIcon(ImageProvider.fromBitmap(bitmap, true, imageId))
      lastChildSnapshot = bitmap
    }
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

  // Drag callbacks. Start/end read the placemark's current geometry (its resting position); onDrag
  // carries the live drag point. Payload mirrors the tap event's identifier + point shape.
  override fun onMapObjectDragStart(mapObject: MapObject) {
    onMarkerDragStart(dragPayload(placemark?.geometry))
  }

  override fun onMapObjectDrag(mapObject: MapObject, point: Point) {
    onMarkerDrag(dragPayload(point))
  }

  override fun onMapObjectDragEnd(mapObject: MapObject) {
    onMarkerDragEnd(dragPayload(placemark?.geometry))
  }

  private fun dragPayload(point: Point?): Map<String, Any?> = mapOf(
    "identifier" to identifier,
    "point" to point?.let { mapOf("latitude" to it.latitude, "longitude" to it.longitude) }
  )

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

  // Animate the marker along a polyline over durationMs at constant speed, facing each segment's
  // bearing (visible when the marker is `rotated`) — courier/route-tracking. No-op until on the map
  // or with fewer than 2 points.
  internal fun animateAlong(points: List<Point>, durationMs: Double) {
    val placemark = placemark ?: return
    if (!placemark.isValid || points.size < 2) {
      return
    }
    val lengths = (0 until points.size - 1).map { approxDistance(points[it], points[it + 1]) }
    val total = lengths.sum()
    if (total <= 0.0) {
      return
    }
    ValueAnimator.ofFloat(0f, 1f).apply {
      duration = durationMs.toLong().coerceAtLeast(0L)
      interpolator = LinearInterpolator()
      addUpdateListener { animation ->
        val current = this@ExpoYandexMapKitMarkerView.placemark ?: return@addUpdateListener
        if (!current.isValid) {
          return@addUpdateListener
        }
        var remaining = total * animation.animatedFraction
        for (i in lengths.indices) {
          val length = lengths[i]
          if (remaining <= length || i == lengths.size - 1) {
            val t = if (length > 0.0) remaining / length else 0.0
            val a = points[i]
            val b = points[i + 1]
            current.geometry = Point(
              a.latitude + t * (b.latitude - a.latitude),
              a.longitude + t * (b.longitude - a.longitude)
            )
            current.direction = bearing(a, b).toFloat()
            return@addUpdateListener
          }
          remaining -= length
        }
      }
      start()
    }
  }

  // Equirectangular length approximation (only relative weighting matters for the tween).
  private fun approxDistance(a: Point, b: Point): Double {
    val meanLat = (a.latitude + b.latitude) / 2 * Math.PI / 180
    val dx = (b.longitude - a.longitude) * cos(meanLat)
    val dy = b.latitude - a.latitude
    return sqrt(dx * dx + dy * dy)
  }

  // Initial bearing a→b in degrees clockwise from north (MapKit's `direction` convention).
  private fun bearing(a: Point, b: Point): Double {
    val lat1 = a.latitude * Math.PI / 180
    val lat2 = b.latitude * Math.PI / 180
    val dLon = (b.longitude - a.longitude) * Math.PI / 180
    val y = sin(dLon) * cos(lat2)
    val x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon)
    val deg = atan2(y, x) * 180 / Math.PI
    return if (deg < 0) deg + 360 else deg
  }
}
