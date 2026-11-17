package com.tccnellore.orderdesk

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private val api = "https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-orders"
    private val publicKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A"
    private val prefs by lazy { getSharedPreferences("tcc_orderdesk", MODE_PRIVATE) }
    private val io = Executors.newSingleThreadExecutor()
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var root: LinearLayout
    private var session = ""
    private val poll = object : Runnable { override fun run() { if (session.isNotBlank()) loadOrders(); handler.postDelayed(this, 4000) } }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = prefs.getString("session", "") ?: ""
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 100)
        if (session.isBlank()) showLogin() else showDashboard()
    }

    private fun base(): LinearLayout {
        root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(24, 28, 24, 24); setBackgroundColor(0xFFF4F0E6.toInt()) }
        setContentView(root)
        return root
    }
    private fun text(value: String, size: Float = 16f, bold: Boolean = false): TextView =
        TextView(this).apply { this.text = value; textSize = size; setTextColor(0xFF203D30.toInt()); if (bold) setTypeface(null, android.graphics.Typeface.BOLD); setPadding(0, 8, 0, 8) }
    private fun button(value: String, action: () -> Unit): Button =
        Button(this).apply { text = value; setOnClickListener { action() } }
    private fun field(hintText: String, secret: Boolean = false) = EditText(this).apply {
        hint = hintText; textSize = 16f
        if (secret) inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
    }

    private fun showLogin() {
        val box = base()
        box.gravity = Gravity.CENTER_VERTICAL
        box.addView(text("TCC · THE COFFEE CLUB", 14f, true))
        box.addView(text("Order Desk", 30f, true))
        box.addView(text("Staff sign in", 16f))
        val user = field("Username"); val pass = field("Password", true)
        box.addView(user); box.addView(pass)
        val status = text("")
        box.addView(button("Sign in") {
            val u = user.text.toString().trim(); val p = pass.text.toString()
            if (u.isBlank() || p.isBlank()) { status.text = "Enter username and password."; return@button }
            status.text = "Signing in…"
            io.execute {
                try {
                    val result = call("login", "POST", JSONObject().put("username", u).put("password", p), false)
                    session = result.getString("token")
                    prefs.edit().putString("session", session).apply()
                    runOnUiThread { showDashboard() }
                } catch (e: Exception) { runOnUiThread { status.text = e.message ?: "Sign-in failed." } }
            }
        })
        box.addView(status)
    }

    private fun showDashboard() {
        handler.removeCallbacks(poll)
        val box = base()
        box.addView(text("TCC ORDER DESK", 13f, true))
        box.addView(text("Orders", 30f, true))
        box.addView(text("New · Accepted & Preparing · Ready & Completed", 13f))
        val actions = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        actions.addView(button("Refresh") { loadOrders() })
        actions.addView(button("Sign out") { io.execute { try { call("logout", "POST", JSONObject()) } catch (_: Exception) {}; session = ""; prefs.edit().remove("session").apply(); runOnUiThread { showLogin() } } })
        box.addView(actions)
        val scroll = ScrollView(this)
        val list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        scroll.addView(list); box.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        list.tag = "order_list"
        loadOrders()
        handler.postDelayed(poll, 4000)
    }

    private fun loadOrders() {
        if (session.isBlank()) return
        io.execute {
            try {
                val data = call("orders", "GET")
                val orders = data.optJSONArray("orders") ?: org.json.JSONArray()
                runOnUiThread {
                    val list = root.findViewWithTag<LinearLayout>("order_list") ?: return@runOnUiThread
                    list.removeAllViews()
                    var n = 0; var p = 0; var done = 0
                    for (i in 0 until orders.length()) when (orders.getJSONObject(i).optString("status")) {
                        "new" -> n++
                        "accepted", "preparing" -> p++
                        "ready", "completed" -> done++
                    }
                    list.addView(text("NEW  $n       ACCEPTED & PREPARING  $p       READY & COMPLETED  $done", 14f, true))
                    for (i in 0 until orders.length()) {
                        val order = orders.getJSONObject(i)
                        val status = order.optString("status")
                        if (status == "cancelled" || status == "completed") continue
                        val card = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(16, 12, 16, 12); setBackgroundColor(0xFFFFFFFF.toInt()) }
                        card.addView(text(order.optString("order_number"), 18f, true))
                        card.addView(text("${status.uppercase()} · ${order.optString("order_type")} · ₹${order.optString("total")}", 14f))
                        val items = order.optJSONArray("items") ?: org.json.JSONArray()
                        for (j in 0 until items.length()) {
                            val item = items.getJSONObject(j)
                            card.addView(text("${item.optInt("quantity",1)} × ${item.optString("name")}", 14f))
                        }
                        when (status) {
                            "new" -> card.addView(button("Accept & Prepare") { updateStatus(order.optString("id"), "preparing") })
                            "accepted", "preparing" -> card.addView(button("Ready & Completed") { updateStatus(order.optString("id"), "completed") })
                        }
                        val lp = LinearLayout.LayoutParams(-1, -2); lp.setMargins(0, 12, 0, 4); list.addView(card, lp)
                    }
                }
            } catch (e: Exception) { runOnUiThread { Toast.makeText(this, e.message ?: "Unable to load orders", Toast.LENGTH_LONG).show() } }
        }
    }

    private fun updateStatus(id: String, status: String) {
        io.execute {
            try { call("update-status", "PATCH", JSONObject().put("id", id).put("status", status)); runOnUiThread { loadOrders() } }
            catch (e: Exception) { runOnUiThread { Toast.makeText(this, e.message ?: "Update failed", Toast.LENGTH_LONG).show() } }
        }
    }

    private fun call(action: String, method: String, body: JSONObject? = null, auth: Boolean = true): JSONObject {
        val url = URL("$api?action=${URLEncoder.encode(action, "UTF-8")}")
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = method; connectTimeout = 15000; readTimeout = 15000
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("apikey", publicKey); setRequestProperty("Authorization", "Bearer $publicKey")
            if (auth && session.isNotBlank()) setRequestProperty("x-tcc-admin-session", session)
            if (body != null) { doOutput = true; outputStream.use { it.write(body.toString().toByteArray()) } }
        }
        val code = connection.responseCode
        val stream = if (code in 200..299) connection.inputStream else connection.errorStream
        val response = stream.bufferedReader().use { it.readText() }
        connection.disconnect()
        val json = if (response.isBlank()) JSONObject() else JSONObject(response)
        if (code !in 200..299) throw IllegalStateException(json.optString("error", "Request failed ($code)"))
        return json
    }

    override fun onResume() { super.onResume(); if (session.isNotBlank()) { handler.removeCallbacks(poll); handler.post(poll) } }
    override fun onPause() { handler.removeCallbacks(poll); super.onPause() }
    override fun onDestroy() { handler.removeCallbacks(poll); io.shutdown(); super.onDestroy() }
}
