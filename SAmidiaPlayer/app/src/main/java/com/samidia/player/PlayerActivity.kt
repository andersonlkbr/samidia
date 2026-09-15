package com.samidia.player

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.PowerManager
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class PlayerActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var wakeLock: PowerManager.WakeLock? = null
    
    private var tapCount = 0
    private var lastTapTime = 0L
    private val RESET_TAP_TIMEOUT = 3000L

    @SuppressLint("SetJavaScriptEnabled", "ClickableViewAccessibility")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_player)

        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SAmidiaPlayer::ScreenWakeLock")
        wakeLock?.acquire()

        hideSystemUI()

        webView = findViewById(R.id.webView)
        
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        
        webView.webViewClient = WebViewClient()

        val prefs = getSharedPreferences("SAmidiaPrefs", Context.MODE_PRIVATE)
        val serverUrl = prefs.getString("serverUrl", "")
        val tvId = prefs.getString("tvId", "")

        if (serverUrl.isNullOrEmpty() || tvId.isNullOrEmpty()) {
            goBackToSetup()
            return
        }

        webView.loadUrl("$serverUrl/player.html?tv=$tvId")

        // Hidden reset logic: 5 taps in top-right corner
        webView.setOnTouchListener { _, event ->
            if (event.action == MotionEvent.ACTION_DOWN) {
                val x = event.x
                val y = event.y
                val width = webView.width
                
                // Top-Right corner (e.g., x > width - 150, y < 150)
                if (x > width - 150 && y < 150) {
                    val currentTime = System.currentTimeMillis()
                    if (currentTime - lastTapTime > RESET_TAP_TIMEOUT) {
                        tapCount = 1
                    } else {
                        tapCount++
                    }
                    lastTapTime = currentTime

                    if (tapCount >= 5) {
                        goBackToSetup()
                    }
                } else {
                    tapCount = 0
                }
            }
            false
        }
    }

    private fun hideSystemUI() {
        window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            hideSystemUI()
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            return true // Block back button
        }
        return super.onKeyDown(keyCode, event)
    }

    private fun goBackToSetup() {
        val prefs = getSharedPreferences("SAmidiaPrefs", Context.MODE_PRIVATE)
        prefs.edit().clear().apply()
        startActivity(Intent(this, SetupActivity::class.java))
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        wakeLock?.let {
            if (it.isHeld) {
                it.release()
            }
        }
    }
}
