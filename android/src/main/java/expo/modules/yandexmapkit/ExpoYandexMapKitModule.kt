package expo.modules.yandexmapkit

import android.content.Context
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.yandex.mapkit.MapKitFactory
import com.yandex.mapkit.geometry.Point
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.CopyOnWriteArrayList

private const val TAG = "ExpoYandexMapKit"

// AndroidManifest <meta-data> names the config plugin writes the optional build-time API key /
// locale into. Keep in sync with plugin/src/index.ts (ANDROID_API_KEY_METADATA /
// ANDROID_LOCALE_METADATA); scripts/check-plugin.mjs asserts the two match.
private const val META_API_KEY = "expo.modules.yandexmapkit.API_KEY"
private const val META_LOCALE = "expo.modules.yandexmapkit.LOCALE"

private class MapKitReinitException : CodedException(
  "ERR_YANDEX_MAPKIT_REINIT",
  "MapKit is already initialized with a different API key — the key cannot be changed at runtime",
  null
)

class ExpoYandexMapKitModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoYandexMapKit")

    // If the config plugin wrote a build-time API key into AndroidManifest metadata, initialize
    // MapKit at startup so the app never has to call initialize(apiKey) from JS (and cannot get
    // the init order wrong). Absent key → this is a no-op and the runtime path is used instead.
    OnCreate {
      val context = appContext.reactContext ?: return@OnCreate
      val apiKey = readManifestMetadata(context, META_API_KEY)?.takeIf { it.isNotBlank() }
        ?: return@OnCreate
      // MapKit init + the view-recovery broadcast must run on the main thread, matching the
      // initialize() AsyncFunction below. A reinit conflict cannot happen here (this is the first
      // initializer) except on a dev reload with a changed key — log rather than crash.
      Handler(Looper.getMainLooper()).post {
        try {
          initializeMapKit(apiKey)
        } catch (e: Throwable) {
          Log.w(TAG, "Failed to auto-initialize MapKit from AndroidManifest metadata", e)
        }
      }
    }

    AsyncFunction("initialize") { apiKey: String ->
      initializeMapKit(apiKey)
    }.runOnQueue(Queues.MAIN)

    OnActivityEntersForeground {
      liveViews.forEach { it.startMap() }
    }

    OnActivityEntersBackground {
      liveViews.forEach { it.stopMap() }
    }

    View(ExpoYandexMapKitView::class) {
      Events("onMapReady", "onCameraPositionChanged", "onMapPress", "onMapLongPress", "onMapLoaded")

      // <Marker> children are managed here, not through the Android view hierarchy — each drives a
      // MapKit placemark rather than a laid-out view.
      GroupView<ExpoYandexMapKitView> {
        AddChildView { parent, child: ExpoYandexMapKitMarkerView, index ->
          parent.addMarkerView(child, index)
        }
        GetChildCount { parent -> parent.markerViewCount() }
        GetChildViewAt { parent, index -> parent.markerViewAt(index) }
        RemoveChildViewAt { parent, index -> parent.removeMarkerViewAt(index) }
        RemoveChildView { parent, child: ExpoYandexMapKitMarkerView ->
          parent.removeMarkerView(child)
        }
      }

      Prop("cameraPosition") { view: ExpoYandexMapKitView, cameraPosition: CameraPositionRecord? ->
        view.setCameraPosition(cameraPosition)
      }

      Prop("animated") { view: ExpoYandexMapKitView, animated: Boolean ->
        view.animated = animated
      }

      Prop("nightMode") { view: ExpoYandexMapKitView, nightMode: Boolean ->
        view.setNightMode(nightMode)
      }

      Prop("scrollGesturesEnabled") { view: ExpoYandexMapKitView, enabled: Boolean ->
        view.setScrollGesturesEnabled(enabled)
      }

      Prop("zoomGesturesEnabled") { view: ExpoYandexMapKitView, enabled: Boolean ->
        view.setZoomGesturesEnabled(enabled)
      }

      Prop("tiltGesturesEnabled") { view: ExpoYandexMapKitView, enabled: Boolean ->
        view.setTiltGesturesEnabled(enabled)
      }

      Prop("rotateGesturesEnabled") { view: ExpoYandexMapKitView, enabled: Boolean ->
        view.setRotateGesturesEnabled(enabled)
      }

      Prop("fastTapEnabled") { view: ExpoYandexMapKitView, enabled: Boolean ->
        view.setFastTapEnabled(enabled)
      }

      Prop("interactiveDisabled") { view: ExpoYandexMapKitView, disabled: Boolean ->
        view.setInteractiveDisabled(disabled)
      }

      Prop("mapType") { view: ExpoYandexMapKitView, mapType: MapTypeOption ->
        view.setMapType(mapType.toYandex())
      }

      Prop("mapStyle") { view: ExpoYandexMapKitView, mapStyle: String? ->
        view.setMapStyle(mapStyle)
      }

      Prop("logoPosition") { view: ExpoYandexMapKitView, logoPosition: LogoPositionRecord? ->
        view.setLogoPosition(logoPosition)
      }

      Prop("logoPadding") { view: ExpoYandexMapKitView, logoPadding: LogoPaddingRecord? ->
        view.setLogoPadding(logoPadding)
      }

      OnViewDidUpdateProps { view: ExpoYandexMapKitView ->
        view.applyPendingCameraPosition()
      }

      AsyncFunction("setCenter") { view: ExpoYandexMapKitView, position: CameraPositionRecord, options: CameraMoveOptionsRecord ->
        view.moveCamera(position, options)
      }

      AsyncFunction("setZoom") { view: ExpoYandexMapKitView, zoom: Double, options: CameraMoveOptionsRecord ->
        view.setZoom(zoom, options)
      }

      AsyncFunction("fitMarkers") { view: ExpoYandexMapKitView, points: List<PointRecord>, options: CameraMoveOptionsRecord ->
        view.fitMarkers(points, options)
      }

      AsyncFunction("getCameraPosition") { view: ExpoYandexMapKitView ->
        view.currentCameraPosition()
      }

      AsyncFunction("getVisibleRegion") { view: ExpoYandexMapKitView ->
        view.currentVisibleRegion()
      }

      AsyncFunction("getScreenPoints") { view: ExpoYandexMapKitView, points: List<PointRecord> ->
        view.screenPoints(points)
      }

      AsyncFunction("getWorldPoints") { view: ExpoYandexMapKitView, points: List<ScreenPointRecord> ->
        view.worldPoints(points)
      }
    }

    // The <Marker> child view. Named, so it is required as requireNativeView('ExpoYandexMapKit',
    // 'ExpoYandexMapKitMarkerView'); the map view above stays the module's default view.
    View(ExpoYandexMapKitMarkerView::class) {
      Name("ExpoYandexMapKitMarkerView")
      Events("onPress")

      Prop("point") { view: ExpoYandexMapKitMarkerView, point: PointRecord ->
        view.setPoint(Point(point.latitude, point.longitude))
      }

      Prop("source") { view: ExpoYandexMapKitMarkerView, source: String? ->
        view.setIconSource(source)
      }

      Prop("scale") { view: ExpoYandexMapKitMarkerView, scale: Double ->
        view.setScale(scale.toFloat())
      }

      Prop("anchor") { view: ExpoYandexMapKitMarkerView, anchor: MarkerAnchorRecord? ->
        view.setAnchor(anchor)
      }

      Prop("visible") { view: ExpoYandexMapKitMarkerView, visible: Boolean ->
        view.setVisible(visible)
      }

      Prop("zI") { view: ExpoYandexMapKitMarkerView, zIndex: Double ->
        view.setZIndexValue(zIndex.toFloat())
      }

      Prop("rotated") { view: ExpoYandexMapKitMarkerView, rotated: Boolean ->
        view.setRotated(rotated)
      }

      Prop("handled") { view: ExpoYandexMapKitMarkerView, handled: Boolean ->
        view.setHandled(handled)
      }

      Prop("identifier") { view: ExpoYandexMapKitMarkerView, identifier: String? ->
        view.setIdentifier(identifier)
      }

      Prop("tracksViewChanges") { view: ExpoYandexMapKitMarkerView, tracks: Boolean ->
        view.setTracksViewChanges(tracks)
      }

      // The animations drive a ValueAnimator, which must be created and started on a Looper
      // (main) thread — Expo runs AsyncFunctions off the main queue by default.
      AsyncFunction("animatedMoveTo") { view: ExpoYandexMapKitMarkerView, point: PointRecord, durationMs: Double ->
        view.animatedMoveTo(Point(point.latitude, point.longitude), durationMs)
      }.runOnQueue(Queues.MAIN)

      AsyncFunction("animatedRotateTo") { view: ExpoYandexMapKitMarkerView, angle: Double, durationMs: Double ->
        view.animatedRotateTo(angle.toFloat(), durationMs)
      }.runOnQueue(Queues.MAIN)
    }
  }

  // Shared initialization for both the JS initialize() call and the build-time auto-init. Runs on
  // the main thread (the AsyncFunction is on Queues.MAIN, the OnCreate path posts to the main
  // looper), so iterating the view registry here is main-thread-safe. Idempotent for the same
  // key; a different key throws MapKitReinitException — the native SDK takes its key once. The
  // idempotent/reinit check runs before the React context or manifest metadata are touched, so a
  // repeat same-key call stays a cheap no-op and never fails on a momentarily-lost context.
  private fun initializeMapKit(apiKey: String) {
    if (isInitialized) {
      if (apiKey != initializedApiKey) {
        throw MapKitReinitException()
      }
      return
    }
    val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
    MapKitFactory.setApiKey(apiKey)
    // A build-time locale (AndroidManifest metadata, written by the config plugin) applies whether
    // the key came from the manifest or from a runtime initialize(). Read it only here, on the
    // one-time init path, and set it before initialize() so it takes effect.
    val locale = readManifestMetadata(context, META_LOCALE)
    if (!locale.isNullOrBlank()) {
      MapKitFactory.setLocale(locale)
    }
    MapKitFactory.initialize(context)
    initializedApiKey = apiKey
    isInitialized = true
    // Recover views that mounted before initialization — they stayed empty because the platform
    // MapView is only created after MapKit is initialized. One view failing to recover must not
    // starve its siblings or reject the already-successful initialize.
    liveViews.forEach {
      try {
        it.onMapKitInitialized()
      } catch (e: Throwable) {
        Log.w(TAG, "Failed to recover a map view after initialize", e)
      }
    }
  }

  // The plugin writes the key/locale as manifest <meta-data> string values; getString returns
  // null for a missing key (or a non-string value, which the plugin never writes). Trimmed so a
  // stray whitespace/newline (e.g. a hand-edited manifest) can't reach setApiKey/setLocale verbatim.
  private fun readManifestMetadata(context: Context, key: String): String? {
    return try {
      val appInfo = context.packageManager.getApplicationInfo(
        context.packageName,
        PackageManager.GET_META_DATA
      )
      appInfo.metaData?.getString(key)?.trim()
    } catch (e: Exception) {
      Log.w(TAG, "Failed to read AndroidManifest metadata \"$key\"", e)
      null
    }
  }

  companion object {
    @Volatile
    internal var isInitialized = false
      private set

    @Volatile
    private var initializedApiKey: String? = null

    private val liveViews = CopyOnWriteArrayList<ExpoYandexMapKitView>()

    internal fun registerView(view: ExpoYandexMapKitView) {
      liveViews.addIfAbsent(view)
    }

    internal fun unregisterView(view: ExpoYandexMapKitView) {
      liveViews.remove(view)
    }

    // MapKitFactory.getInstance().onStart()/onStop() is a global switch and is not documented
    // as reference-counted, so the factory calls are centralized here: onStart only on the
    // 0→1 transition, onStop only on the 1→0 transition. Per-view mapView.onStart()/onStop()
    // stay in the view. The counter stays balanced because each view calls onViewStarted()/
    // onViewStopped() exclusively from startMap()/stopMap(), which are guarded by the view's
    // isStarted flag — every view contributes at most +1, and only after it has contributed +1
    // can it contribute -1, so the counter never goes negative. All callers run on the main
    // thread (attach/detach, activity foreground/background, initialize on Queues.MAIN), so a
    // plain Int needs no extra synchronization.
    private var startedViewCount = 0

    internal fun onViewStarted() {
      if (startedViewCount == 0) {
        MapKitFactory.getInstance().onStart()
      }
      startedViewCount++
    }

    internal fun onViewStopped() {
      startedViewCount--
      if (startedViewCount == 0) {
        MapKitFactory.getInstance().onStop()
      }
    }
  }
}
