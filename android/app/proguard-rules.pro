# Arda Browser - R8 / ProGuard kurallari
# Amac: dagitilan release APK'sinin kodunu gizlemek (obfuscation),
# boylece baskasi alip degistiremesin / kendi tarayicisi yapamasin.

# --- WorkManager ---
# Worker'lar isimleriyle (reflection) olusturulur; silinmemeli/yeniden
# adlandirilmamali. TipWorker bu kural sayesinde calismaya devam eder.
-keep class * extends androidx.work.ListenableWorker {
    public <init>(android.content.Context, androidx.work.WorkerParameters);
}

# --- WebView ---
# Su an JavaScript koprusu (@JavascriptInterface) kullanilmiyor; ileride
# eklenirse bu kural acilmali:
# -keepclassmembers class * {
#     @android.webkit.JavascriptInterface <methods>;
# }

# --- Kotlin ---
-dontwarn kotlin.**
-dontwarn org.jetbrains.annotations.**

# Hata ayiklama izini gizli tut ama satir bilgisini sakla (cokme raporlari icin)
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
