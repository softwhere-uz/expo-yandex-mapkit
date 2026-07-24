package expo.modules.yandexmapkit

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import java.net.URL
import java.util.concurrent.ConcurrentHashMap

// Loads a marker icon from the URI the JS layer resolved (via Image.resolveAssetSource):
//   - http(s):// — fetched off the main thread (Metro dev-server assets arrive this way),
//   - data:image;base64 — decoded inline,
//   - file:// — read from disk,
//   - otherwise treated as a drawable resource name (release builds of bundled require()d assets).
// Decoded bitmaps are cached by URI so re-rendering a marker with the same icon costs nothing.
// The callback always runs on the main thread (where MapKit objects must be touched).
internal object MarkerImageLoader {
  private const val TAG = "ExpoYandexMapKit"
  private val cache = ConcurrentHashMap<String, Bitmap>()
  private val mainHandler = Handler(Looper.getMainLooper())

  fun load(context: Context, source: String, callback: (Bitmap?) -> Unit) {
    cache[source]?.let {
      callback(it)
      return
    }
    val appContext = context.applicationContext
    Thread {
      val bitmap = try {
        decode(appContext, source)
      } catch (e: Exception) {
        Log.w(TAG, "Failed to load marker image \"$source\"", e)
        null
      }
      mainHandler.post {
        if (bitmap != null) {
          cache[source] = bitmap
        }
        callback(bitmap)
      }
    }.start()
  }

  private fun decode(context: Context, source: String): Bitmap? {
    return when {
      source.startsWith("http://") || source.startsWith("https://") ->
        URL(source).openStream().use { BitmapFactory.decodeStream(it) }

      source.startsWith("data:image") -> {
        val base64 = source.substringAfter(',', "")
        val bytes = Base64.decode(base64, Base64.DEFAULT)
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
      }

      source.startsWith("file://") ->
        BitmapFactory.decodeFile(source.removePrefix("file://"))

      else -> {
        val resId = context.resources.getIdentifier(source, "drawable", context.packageName)
        if (resId == 0) null else BitmapFactory.decodeResource(context.resources, resId)
      }
    }
  }
}
