package com.tccnellore.orderdesk

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class OrderDeskMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        getSharedPreferences("tcc_orderdesk", Context.MODE_PRIVATE).edit().putString("fcm_token", token).apply()
    }
    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.data["title"] ?: message.notification?.title ?: "TCC Order Desk"
        val body = message.data["body"] ?: message.notification?.body ?: "There is an update in your Order Desk."
        val channelId = "tcc_order_alerts_v2"
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) manager.createNotificationChannel(NotificationChannel(channelId, "New order alerts", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "Alerts for new TCC customer orders and table requests"
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 250, 150, 250)
            setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI,
                android.media.AudioAttributes.Builder().setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION).build())
            lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
        })
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("open_order_id", message.data["order_id"])
        }
        val pending = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        manager.notify((System.currentTimeMillis() % Int.MAX_VALUE).toInt(), NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_stat_tcc).setContentTitle(title).setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body)).setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true).setDefaults(NotificationCompat.DEFAULT_ALL).setCategory(NotificationCompat.CATEGORY_MESSAGE).setVisibility(NotificationCompat.VISIBILITY_PUBLIC).setContentIntent(pending).build())
    }
}
