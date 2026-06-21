package com.arda.browser

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.Worker
import androidx.work.WorkerParameters

object Notifier {
    const val CHANNEL = "arda_tips"

    fun ensureChannel(ctx: Context) {
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL, "Arda Browser", NotificationManager.IMPORTANCE_DEFAULT).apply {
                    description = "Arda Browser bilgilendirmeleri"
                }
            )
        }
    }

    fun ensurePrivateChannel(ctx: Context) {
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel("arda_private") == null) {
            nm.createNotificationChannel(
                NotificationChannel("arda_private", "Gizli sekmeler", NotificationManager.IMPORTANCE_LOW).apply {
                    description = "Gizli sekmeler açıkken gösterilir"
                }
            )
        }
    }

    fun show(ctx: Context, title: String, text: String) {
        ensureChannel(ctx)
        val launch = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)
        val pi = PendingIntent.getActivity(
            ctx, 0, launch,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val notif = NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(R.drawable.ic_notif)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setAutoCancel(true)
            .setContentIntent(pi)
            .build()
        try {
            NotificationManagerCompat.from(ctx).notify((0..999999).random(), notif)
        } catch (e: SecurityException) {
            // Bildirim izni yoksa sessizce gec
        }
    }
}

class TipWorker(ctx: Context, params: WorkerParameters) : Worker(ctx, params) {
    override fun doWork(): Result {
        val tips = listOf(
            "🛡️ Arda Browser bugün de seni reklam ve izleyicilerden koruyor.",
            "🕶️ Gizli sekmeyle iz bırakmadan gezebilirsin.",
            "🌐 Yabancı bir siteyi tek dokunuşla Türkçe'ye çevir.",
            "⭐ Sık girdiğin siteleri yer imine eklemeyi unutma.",
            "🔎 Bir şey keşfetmek ister misin? Arda Browser seni bekliyor."
        )
        Notifier.show(applicationContext, "Arda Browser", tips.random())
        return Result.success()
    }
}
