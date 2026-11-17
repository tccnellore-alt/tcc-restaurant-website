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
        // Device-token registration will be connected to the secured Supabase endpoint.
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.data["title"] ?: message.notification?.title ?: "TCC · New QR order"
        val body = message.data["body"] ?: message.notification?.body ?: "A new order needs attention."
        val manager = getSystemService(NotificationManager::class.java)
        val channelId = "tcc_orders"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(NotificationChannel(channelId, "TCC Order Alerts", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "New orders and pending order reminders"
                enableVibration(true)
            })
        }
        val open = Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val pending = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title).setContentText(body).setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_MAX).setAutoCancel(true).setContentIntent(pending).build()
        manager.notify((System.currentTimeMillis() % Int.MAX_VALUE).toInt(), notification)
    }
}
