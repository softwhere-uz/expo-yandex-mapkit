package expo.modules.yandexmapkit

import com.yandex.mapkit.MapKitFactory
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.CopyOnWriteArrayList

private class MapKitReinitException : CodedException(
  "ERR_YANDEX_MAPKIT_REINIT",
  "MapKit is already initialized with a different API key — the key cannot be changed at runtime",
  null
)

class ExpoYandexMapKitModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoYandexMapKit")

    AsyncFunction("initialize") { apiKey: String ->
      if (isInitialized) {
        // Idempotent: the same key resolves silently, a different key rejects.
        if (apiKey != initializedApiKey) {
          throw MapKitReinitException()
        }
      } else {
        val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
        MapKitFactory.setApiKey(apiKey)
        MapKitFactory.initialize(context)
        initializedApiKey = apiKey
        isInitialized = true
        // Recover views that mounted before initialize() resolved — they stayed empty because
        // the platform MapView is only created after MapKit is initialized. This function runs
        // on Queues.MAIN, so iterating the registry here is main-thread-safe. One view failing
        // to recover must not starve its siblings or reject the already-successful initialize.
        liveViews.forEach {
          try {
            it.onMapKitInitialized()
          } catch (e: Throwable) {
            android.util.Log.w("ExpoYandexMapKit", "Failed to recover a map view after initialize", e)
          }
        }
      }
    }.runOnQueue(Queues.MAIN)

    OnActivityEntersForeground {
      liveViews.forEach { it.startMap() }
    }

    OnActivityEntersBackground {
      liveViews.forEach { it.stopMap() }
    }

    View(ExpoYandexMapKitView::class) {
      Events("onMapReady", "onCameraPositionChanged", "onMapPress", "onMapLongPress")

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
