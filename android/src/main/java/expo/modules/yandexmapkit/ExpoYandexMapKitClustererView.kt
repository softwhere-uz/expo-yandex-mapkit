package expo.modules.yandexmapkit

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.os.Handler
import android.os.Looper
import android.view.View
import com.yandex.mapkit.geometry.Point
import com.yandex.mapkit.map.Cluster
import com.yandex.mapkit.map.ClusterListener
import com.yandex.mapkit.map.ClusterTapListener
import com.yandex.mapkit.map.ClusterizedPlacemarkCollection
import com.yandex.mapkit.map.MapObjectCollection
import com.yandex.runtime.image.ImageProvider
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.lang.ref.WeakReference

private const val DEFAULT_CLUSTER_RADIUS = 60.0
private const val DEFAULT_MIN_ZOOM = 12
private val DEFAULT_CLUSTER_COLOR = 0xFF3478F6.toInt()
private val DEFAULT_TEXT_COLOR = Color.WHITE
private const val DEFAULT_TEXT_SIZE = 13f
private const val DEFAULT_CLUSTER_SIZE = 36f

// Offset (in dp) for the count text within the cluster badge — positive x → right, y → down.
class ClusterOffsetRecord : Record {
  @Field
  var x: Double = 0.0

  @Field
  var y: Double = 0.0
}

// A `<Clusterer>`. An (invisible) ExpoView that groups its `<Marker>` children into a MapKit
// ClusterizedPlacemarkCollection. It is itself a MapObjectChild — attaching to the map creates its
// cluster collection off the map's root collection, and its own `<Marker>` children then attach to
// *that* collection (via attachToCluster) instead of the root, so they participate in clustering.
// Marker changes (add / remove / move) coalesce into one clusterPlacemarks() pass per frame.
class ExpoYandexMapKitClustererView(context: Context, appContext: AppContext) :
  ExpoView(context, appContext), MapObjectChild, ClusterListener {
  private val onClusterPress by EventDispatcher<Map<String, Any>>()

  private var clusterCollection: ClusterizedPlacemarkCollection? = null
  // The map's root collection (passed to attachToMap). Kept so a marker with `excludeFromCluster`
  // can be attached here — as a standalone placemark — instead of the cluster collection.
  private var rootCollection: MapObjectCollection? = null
  // Markers currently attached to the root collection (excluded from clustering), by identity. Lets
  // detach remove each marker from the collection it actually lives in, even across an exclusion flip.
  private val excludedMarkers = mutableSetOf<View>()
  // The map view that owns this clusterer, for the tap-to-fit camera move. Weak: the map view owns
  // this view (via its child list), so a strong ref here would be a retain cycle.
  private var mapViewRef: WeakReference<ExpoYandexMapKitView>? = null

  // Clustering config. Setters re-cluster so a change takes effect — clusterPlacemarks() re-runs
  // onClusterAdded, which re-renders every badge with the current style.
  private var clusterRadius = DEFAULT_CLUSTER_RADIUS
  private var minZoom = DEFAULT_MIN_ZOOM
  private var clusterColor = DEFAULT_CLUSTER_COLOR
  private var clusterTextColor = DEFAULT_TEXT_COLOR
  private var clusterTextSize = DEFAULT_TEXT_SIZE
  private var clusterSize = DEFAULT_CLUSTER_SIZE
  private var fitOnPress = true

  // Custom badge icon (replaces the drawn disc). Loaded async by URI (the marker convention); once
  // loaded, a recluster re-runs onClusterAdded so every badge redraws with the image. The count text
  // is still drawn on top at `clusterTextOffset` (dp from center).
  private var clusterIconSource: String? = null
  private var appliedClusterIconSource: String? = null
  private var clusterIconBitmap: Bitmap? = null
  private var clusterTextOffsetX = 0f
  private var clusterTextOffsetY = 0f

  // Child <Marker> views, in mount order. Managed via the module's GroupView actions (like the map
  // view's own children). A marker mounted before this clusterer attaches stays here un-attached and
  // is wired to the cluster collection in attachToMap.
  private val childViews = mutableListOf<View>()

  // This view is tracked in the map view's child list but is NOT added to the Android view
  // hierarchy (it owns no UI, like markers/shapes), so it never attaches to a window — and
  // View.post() only runs once attached. Coalesce re-clusters through a main-thread Handler instead,
  // which runs regardless of attachment.
  private val mainHandler = Handler(Looper.getMainLooper())
  private var reclusterScheduled = false
  private val reclusterRunnable = Runnable {
    reclusterScheduled = false
    clusterCollection?.clusterPlacemarks(clusterRadius, minZoom)
  }

  // MapKit holds the tap listener weakly (4.41+); this strong field keeps it alive. One listener
  // serves every cluster — the tapped cluster arrives as the callback argument.
  private val clusterTapListener = ClusterTapListener { cluster ->
    handleClusterTap(cluster)
    true // consume so a cluster tap never also falls through to the map's onMapPress
  }

  // Child <Marker> management. Called from the module's GroupView actions (like the map view).

  internal fun addChildView(child: View, index: Int) {
    childViews.add(index.coerceIn(0, childViews.size), child)
    attachMarker(child)
    scheduleRecluster()
  }

  internal fun removeChildViewAt(index: Int) {
    val child = childViews.getOrNull(index) ?: return
    childViews.removeAt(index)
    detachMarker(child)
    scheduleRecluster()
  }

  internal fun removeChildView(child: View) {
    if (childViews.remove(child)) {
      detachMarker(child)
      scheduleRecluster()
    }
  }

  internal fun childViewCount(): Int = childViews.size

  internal fun childViewAt(index: Int): View? = childViews.getOrNull(index)

  // MapObjectChild: attach the cluster collection to the map's root collection, then attach the
  // markers into it. No-op if already attached.

  override fun attachToMap(collection: MapObjectCollection) {
    if (clusterCollection != null) {
      return
    }
    // Keep the root collection first — attachMarker routes excluded markers into it.
    rootCollection = collection
    // MapKit holds the ClusterListener weakly (4.41+); this view is the strong owner and is itself
    // kept alive by the map view's child list while mounted.
    val created = collection.addClusterizedPlacemarkCollection(WeakReference(this))
    clusterCollection = created
    childViews.forEach { attachMarker(it) }
    scheduleRecluster()
  }

  override fun detachFromMap(collection: MapObjectCollection) {
    val created = clusterCollection ?: return
    childViews.forEach { detachMarker(it) }
    collection.remove(created)
    clusterCollection = null
    rootCollection = null
    excludedMarkers.clear()
  }

  override val isAttachedToMap: Boolean
    get() = clusterCollection != null

  // Called by the map view when it attaches / detaches this clusterer, so a cluster tap can fit the
  // camera through the map view's fit path.
  internal fun bindMapView(view: ExpoYandexMapKitView) {
    mapViewRef = WeakReference(view)
  }

  internal fun unbindMapView() {
    mapViewRef = null
  }

  // The geographic positions of every clustered marker, for the map's fitAllMarkers().
  internal fun markerGeoPoints(): List<Point> =
    childViews.filterIsInstance<ExpoYandexMapKitMarkerView>().mapNotNull { it.geoPoint() }

  private fun attachMarker(child: View) {
    val marker = child as? ExpoYandexMapKitMarkerView ?: return
    // A marker move must re-cluster; route the marker's geometry change back to this clusterer.
    marker.onClusterInvalidate = { scheduleRecluster() }
    // A flip of excludeFromCluster after attach re-routes this marker between the two collections.
    marker.onExclusionChanged = {
      detachMarker(marker)
      attachMarker(marker)
      scheduleRecluster()
    }
    val root = rootCollection
    if (marker.excludeFromCluster && root != null) {
      // Excluded: a standalone placemark on the map's root collection — never clustered.
      marker.attachToMap(root)
      excludedMarkers.add(marker)
    } else {
      clusterCollection?.let { marker.attachToCluster(it) }
    }
  }

  private fun detachMarker(child: View) {
    val marker = child as? ExpoYandexMapKitMarkerView ?: return
    marker.onClusterInvalidate = null
    marker.onExclusionChanged = null
    if (excludedMarkers.remove(marker)) {
      rootCollection?.let { marker.detachFromMap(it) }
    } else {
      clusterCollection?.let { marker.detachFromCluster(it) }
    }
  }

  // Coalesce re-clustering to once per main-loop turn — adding N markers in one commit triggers a
  // single clusterPlacemarks() rather than N. No-op until the cluster collection exists.
  internal fun scheduleRecluster() {
    if (reclusterScheduled) {
      return
    }
    reclusterScheduled = true
    mainHandler.post(reclusterRunnable)
  }

  // Props.

  internal fun setClusterRadius(value: Double) {
    clusterRadius = if (value > 0) value else DEFAULT_CLUSTER_RADIUS
    scheduleRecluster()
  }

  internal fun setMinZoom(value: Int) {
    minZoom = value
    scheduleRecluster()
  }

  internal fun setClusterColor(color: Int?) {
    clusterColor = color ?: DEFAULT_CLUSTER_COLOR
    scheduleRecluster()
  }

  internal fun setClusterTextColor(color: Int?) {
    clusterTextColor = color ?: DEFAULT_TEXT_COLOR
    scheduleRecluster()
  }

  internal fun setClusterTextSize(value: Float) {
    clusterTextSize = if (value > 0) value else DEFAULT_TEXT_SIZE
    scheduleRecluster()
  }

  internal fun setClusterSize(value: Float) {
    clusterSize = if (value > 0) value else DEFAULT_CLUSTER_SIZE
    scheduleRecluster()
  }

  internal fun setFitOnPress(value: Boolean) {
    fitOnPress = value
  }

  internal fun setClusterIcon(uri: String?) {
    if (uri != clusterIconSource) {
      clusterIconSource = uri
      // The icon changed — drop the cached bitmap so it (re)loads (or clears) on the next pass.
      appliedClusterIconSource = null
      clusterIconBitmap = null
      loadClusterIconIfNeeded()
    }
  }

  internal fun setClusterTextOffset(offset: ClusterOffsetRecord?) {
    clusterTextOffsetX = offset?.x?.toFloat() ?: 0f
    clusterTextOffsetY = offset?.y?.toFloat() ?: 0f
    scheduleRecluster()
  }

  // Load the badge icon by URI (async) and, once decoded, recluster so every badge redraws with it.
  // Clearing the icon reclusters immediately to restore the drawn disc.
  private fun loadClusterIconIfNeeded() {
    val source = clusterIconSource
    if (source.isNullOrEmpty()) {
      scheduleRecluster()
      return
    }
    if (source == appliedClusterIconSource) {
      return
    }
    appliedClusterIconSource = source
    MarkerImageLoader.load(context, source) { loaded ->
      if (loaded != null && source == appliedClusterIconSource) {
        clusterIconBitmap = loaded
        scheduleRecluster()
      }
    }
  }

  // ClusterListener: style each cluster's badge and wire its tap listener as MapKit creates it.

  override fun onClusterAdded(cluster: Cluster) {
    cluster.appearance.setIcon(ImageProvider.fromBitmap(renderClusterBadge(cluster.size)))
    cluster.addClusterTapListener(WeakReference(clusterTapListener))
  }

  private fun handleClusterTap(cluster: Cluster) {
    val center = cluster.appearance.geometry
    onClusterPress(
      mapOf(
        "size" to cluster.size,
        "point" to mapOf("latitude" to center.latitude, "longitude" to center.longitude)
      )
    )
    if (fitOnPress) {
      mapViewRef?.get()?.fitToClusterPoints(cluster.placemarks.map { it.geometry })
    }
  }

  // A cluster badge with the count drawn on top. When a `clusterIcon` image is set it is used as the
  // badge (at its own size); otherwise a filled disc of clusterColor with a thin white border is
  // drawn (growing for 3+ digit counts so long numbers still fit). Drawn at display density.
  private fun renderClusterBadge(count: Int): Bitmap {
    val density = resources.displayMetrics.density
    val label = count.toString()
    val icon = clusterIconBitmap
    if (icon != null) {
      // copy() may return null (e.g. OOM); fall through to the drawn disc if so.
      val bitmap = icon.copy(Bitmap.Config.ARGB_8888, true)
      if (bitmap != null) {
        val canvas = Canvas(bitmap)
        drawCount(canvas, label, bitmap.width / 2f, bitmap.height / 2f, density)
        return bitmap
      }
    }
    val extraDigits = (label.length - 2).coerceAtLeast(0)
    val diameter = ((clusterSize + extraDigits * 8f) * density).toInt().coerceAtLeast(1)
    val bitmap = Bitmap.createBitmap(diameter, diameter, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val center = diameter / 2f
    val border = 2f * density
    val ringPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }
    canvas.drawCircle(center, center, center, ringPaint)
    val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = clusterColor }
    canvas.drawCircle(center, center, center - border, fillPaint)
    drawCount(canvas, label, center, center, density)
    return bitmap
  }

  // Draw the count centered at (cx, cy) in bold, shifted by clusterTextOffset (dp). Shared by the
  // disc and icon badges.
  private fun drawCount(canvas: Canvas, label: String, cx: Float, cy: Float, density: Float) {
    val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = clusterTextColor
      textSize = clusterTextSize * density
      textAlign = Paint.Align.CENTER
      typeface = Typeface.DEFAULT_BOLD
    }
    val metrics = textPaint.fontMetrics
    val baseline = cy - (metrics.ascent + metrics.descent) / 2f + clusterTextOffsetY * density
    canvas.drawText(label, cx + clusterTextOffsetX * density, baseline, textPaint)
  }
}
