package expo.modules.mpvplayer.danmaku

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import expo.modules.mpvplayer.DeviceKind
import org.json.JSONObject
import java.util.concurrent.Executors
import java.util.concurrent.Future
import java.util.concurrent.TimeUnit

/** Transparent sibling of the video surface; independent of subtitle and playback state. */
class DanmakuOverlay(context: Context) : FrameLayout(context) {
    companion object {
        private val worker = Executors.newFixedThreadPool(2)
        private val deadlines = Executors.newSingleThreadScheduledExecutor()
    }
    var clock: () -> Double? = { null }
    var onStatus: (String, Int) -> Unit = { _, _ -> }
    var showNativeControls = true
    private var chromeVisible = true
    fun setControlsVisible(value: Boolean) { chromeVisible = value; updateVisibility() }
    private fun report(key: String) { status.text = if(key == "disabled") "" else label(key); onStatus(key, entries.size) }
    private fun updateVisibility() { visibility = if(config == null || suspended) GONE else VISIBLE; controls.visibility = if(config == null || suspended || !showNativeControls || !chromeVisible) GONE else VISIBLE }
    private var generation = 0
    private var geometryGeneration = 0
    private var planJob: Future<*>? = null
    private var request: DanmakuCore.Request? = null
    private var job: Future<*>? = null
    private var timeout: Future<*>? = null
    private var config: JSONObject? = null
    private var sourceJson = ""
    private var enabled = false
    private var suspended = false
    private var entries: List<DanmakuCore.Entry> = emptyList()
    private var cues: List<DanmakuCore.Cue> = emptyList()
    private var duration = 8.0
    private var offset = 0.0
    private var lineHeight = 30f
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val status = TextView(context).apply { setTextColor(Color.WHITE); textSize = 12f }
    private val toggle = Button(context)
    private val retry = Button(context)
    val controls = LinearLayout(context).apply {
        gravity = Gravity.CENTER_VERTICAL
        setBackgroundColor(0x88000000.toInt())
        addView(toggle); addView(status); addView(retry)
    }
    private val drawing = object : View(context) {
        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            if (!enabled || suspended) return
            val t = clock()?.plus(offset)
            if (t != null && t.isFinite()) {
                // Binary-search the bounded lifetime window, rather than scan the whole file per frame.
                var lo = 0; var hi = cues.size
                while (lo < hi) { val mid = (lo + hi) ushr 1; if (cues[mid].entry.time < t - duration) lo = mid + 1 else hi = mid }
                canvas.save(); canvas.clipRect(0f, 0f, width.toFloat(), height * .7f)
                var i = lo
                while (i < cues.size && cues[i].entry.time <= t) {
                    val cue = cues[i++]; val age = t - cue.entry.time
                    val x = if (cue.entry.mode == 1) width - (width + cue.width) * (age / duration).toFloat() else (width - cue.width) / 2f
                    paint.color = cue.entry.color or (0xff shl 24)
                    paint.alpha = (number("opacity", .85, .3, 1.0) * 255).toInt()
                    canvas.drawText(cue.entry.text, x, (cue.lane + 1) * lineHeight - paint.fontMetrics.descent, paint)
                }
                canvas.restore()
            }
            postInvalidateOnAnimation()
        }
        override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) { replan() }
    }
    init {
        isClickable = false; isFocusable = false
        addView(drawing, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
        addView(controls, LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT, Gravity.TOP or Gravity.END).apply { topMargin = (56 * resources.displayMetrics.density).toInt() })
        visibility = GONE
        controls.visibility = GONE
        toggle.setOnClickListener { enabled = !enabled; if (enabled) load() else { cancel(); entries = emptyList(); cues = emptyList(); report("disabled") }; updateControls(); drawing.invalidate() }
        retry.setOnClickListener { load() }
    }
    private fun number(key: String, default: Double, min: Double, max: Double): Double =
        (config?.optDouble(key, default) ?: default).let { if (it.isFinite()) it.coerceIn(min, max) else default }
    private fun label(key: String): String = config?.optJSONObject("labels")?.optString(key, key) ?: key
    private fun updateControls() { toggle.text = label("toggle"); toggle.isSelected = enabled; toggle.contentDescription = label("toggle"); retry.text = label("retry"); retry.visibility = if(enabled) VISIBLE else GONE }
    fun configure(json: String?) {
        val next = json ?: ""
        if (next == sourceJson) return
        sourceJson = next; cancel(); entries = emptyList(); cues = emptyList()
        config = try { if (next.isBlank()) null else JSONObject(next) } catch (_: Exception) { null }
        if (DeviceKind.isTelevision(context)) config = null
        enabled = config?.optBoolean("enabled", false) == true
        updateVisibility()
        updateControls(); if (enabled && !suspended) load() else report("disabled")
        drawing.invalidate()
    }
    fun suspendOverlay(value: Boolean) {
        if (suspended == value) return
        suspended = value; updateVisibility()
        if(value) cancel() else if(enabled) load()
    }
    private fun cancel() { geometryGeneration++; planJob?.cancel(true); planJob = null; generation++; request?.cancel(); request = null; job?.cancel(true); job = null; timeout?.cancel(false); timeout = null }
    fun clear() { sourceJson = ""; config = null; enabled = false; cancel(); entries = emptyList(); cues = emptyList(); updateVisibility(); report("disabled") }
    private fun load() {
        cancel(); entries = emptyList(); cues = emptyList(); drawing.invalidate()
        val c = config ?: return
        if (!enabled || suspended) return
        val token = generation; val req = DanmakuCore.Request(); request = req
        report("loading")
        val task = worker.submit {
            try {
                val headers = mutableMapOf<String, String>(); c.optJSONObject("headers")?.let { h -> h.keys().forEach { key -> headers[key] = h.getString(key) } }
                val result = req.run(DanmakuCore.endpoint(c.getString("serverUrl"), c.getString("itemId")), headers)
                post { if(generation == token) { generation++; timeout?.cancel(false); entries = result; replan(); report(if(result.isEmpty()) "empty" else "ready") } }
            } catch(e: Exception) {
                val key = if(e.message == "auth" || e.message == "unavailable") e.message!! else "error"
                post { if(generation == token) { generation++; timeout?.cancel(false); report(key) } }
            }
        }
        job = task
        timeout = deadlines.schedule({ req.cancel(); task.cancel(true); post { if(generation == token) { generation++; report("error") } } }, 15, TimeUnit.SECONDS)
    }
    private fun replan() {
        geometryGeneration++
        planJob?.cancel(true)
        planJob = null
        cues = emptyList()
        drawing.invalidate()
        if (!enabled || suspended || entries.isEmpty() || drawing.height <= 0) return
        paint.textSize = (20 * resources.displayMetrics.scaledDensity * number("fontScale", 1.0, .7, 1.5)).toFloat()
        paint.setShadowLayer(2f, 1f, 1f, Color.BLACK)
        lineHeight = paint.fontMetrics.bottom - paint.fontMetrics.top + 6 * resources.displayMetrics.density
        duration = number("durationSeconds", 8.0, 4.0, 12.0)
        offset = number("offsetSeconds", 0.0, -30.0, 30.0)
        val lanes = minOf(number("maxLines", 5.0, 1.0, 8.0).toInt(), (drawing.height * .7f / lineHeight).toInt()).coerceAtLeast(1)
        // Paint is mutable and not shared between the Canvas and worker. Capture
        // all geometry/configuration on main, then measure even large files off it.
        val measuringPaint = Paint(paint)
        val snapshot = entries
        val lifetime = duration
        val token = generation
        val geometryToken = geometryGeneration
        planJob = worker.submit {
            try {
                val result = DanmakuCore.plan(snapshot, lanes, lifetime) { measuringPaint.measureText(it) }
                post {
                    if (generation == token && geometryGeneration == geometryToken && enabled && !suspended) {
                        cues = result
                        drawing.invalidate()
                    }
                }
            } catch (_: java.util.concurrent.CancellationException) {
                // Replacement geometry/configuration owns the next result.
            } catch (_: Exception) {
                post { if (generation == token && geometryGeneration == geometryToken) report("error") }
            }
        }
    }
    override fun onAttachedToWindow() { super.onAttachedToWindow(); if(config != null && enabled && !suspended) load() }
    override fun onDetachedFromWindow() { cancel(); super.onDetachedFromWindow() }
}
