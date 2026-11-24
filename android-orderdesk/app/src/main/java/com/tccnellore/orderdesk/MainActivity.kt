package com.tccnellore.orderdesk

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessaging

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private val prefs by lazy { getSharedPreferences("tcc_orderdesk", MODE_PRIVATE) }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 100)
        }
        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.loadsImagesAutomatically = true
            settings.setSupportZoom(false)
            webChromeClient = WebChromeClient()
            addJavascriptInterface(NativeBridge(), "TCCAndroid")
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    val host = request.url.host ?: return true
                    return host != "feature-android-orderdesk-test.tcc-restaurant-website.pages.dev" &&
                        host != "inuesaudvhlcqswrltik.supabase.co"
                }
                override fun onPageFinished(view: WebView, url: String) {
                    super.onPageFinished(view, url)
                    publishPushToken()
                }
            }
        }
        setContentView(webView)
        if (savedInstanceState == null) webView.loadUrl(BuildConfig.DASHBOARD_URL) else webView.restoreState(savedInstanceState)
        refreshPushToken()
    }

    private fun refreshPushToken() {
        try {
            FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
                prefs.edit().putString("fcm_token", token).apply()
                publishPushToken()
            }
        } catch (_: Exception) { }
    }

    private fun publishPushToken() {
        val token = prefs.getString("fcm_token", "") ?: ""
        if (token.isBlank() || !::webView.isInitialized) return
        webView.post { webView.evaluateJavascript("window.TCCAndroidPushToken=${org.json.JSONObject.quote(token)};window.dispatchEvent(new Event('tcc-push-token-ready'));", null) }
    }

    companion object { private const val TEST_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJpbnVlc2F1ZHZobGNxc3dybHRpayIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzk1NDQ5MDQ2LCJleHAiOjIxMTAyNTA0Nn0.tiROk1IwNB5xti81vjg6Fx4hGTJykMzvaa6O2HmDhdk" }

    inner class NativeBridge {
        @JavascriptInterface fun appVersion(): String = BuildConfig.VERSION_NAME
        @JavascriptInterface fun registerPushToken(token: String, session: String) {
            Thread {
                try {
                    val url = java.net.URL("https://inuesaudvhlcqswrltik.supabase.co/functions/v1/tcc-orders?action=register-device")
                    val connection = (url.openConnection() as java.net.HttpURLConnection).apply {
                        requestMethod = "POST"; connectTimeout = 12000; readTimeout = 12000; doOutput = true
                        setRequestProperty("Content-Type", "application/json")
                        setRequestProperty("apikey", TEST_API_KEY)
                        setRequestProperty("Authorization", "Bearer $TEST_API_KEY")
                        setRequestProperty("x-tcc-admin-session", session)
                    }
                    val body = org.json.JSONObject().put("fcm_token", token).put("device_name", Build.MODEL).toString()
                    connection.outputStream.use { it.write(body.toByteArray()) }
                    connection.inputStream.close(); connection.disconnect()
                } catch (_: Exception) { }
            }.start()
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        if (::webView.isInitialized) webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }
    @Deprecated("Android back navigation")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
    override fun onDestroy() {
        if (::webView.isInitialized) webView.destroy()
        super.onDestroy()
    }
}
