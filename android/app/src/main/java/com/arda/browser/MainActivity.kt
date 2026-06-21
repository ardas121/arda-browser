package com.arda.browser

import android.annotation.SuppressLint
import android.Manifest
import android.app.AlertDialog
import android.app.DownloadManager
import android.app.PendingIntent
import android.content.Intent
import android.content.ClipboardManager
import android.content.ClipData
import android.graphics.drawable.GradientDrawable
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.webkit.URLUtil
import android.os.Bundle
import android.os.Message
import android.text.TextUtils
import android.text.Editable
import android.text.TextWatcher
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.webkit.ValueCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.AutoCompleteTextView
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.PopupMenu
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.net.URI

class Tab(val web: WebView, var title: String = "Yeni sekme", val priv: Boolean = false) {
    var desktop: Boolean = false
}

class MainActivity : AppCompatActivity() {

    private val tabs = mutableListOf<Tab>()
    private var current: Tab? = null

    @Volatile private var shieldsOn = true
    @Volatile private var blocked = 0

    private lateinit var container: FrameLayout
    private lateinit var address: AutoCompleteTextView
    private val addressTargets = LinkedHashMap<String, String>()
    private lateinit var progress: ProgressBar
    private lateinit var shieldsView: TextView
    private lateinit var tabCountView: TextView
    private lateinit var tabSwitcher: View
    private lateinit var tabList: LinearLayout
    private lateinit var backView: TextView
    private lateinit var forwardView: TextView

    private val prefs by lazy { getSharedPreferences("arda", MODE_PRIVATE) }

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private val fileChooser = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        filePathCallback?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data))
        filePathCallback = null
    }
    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null

    private val BLOCKLIST = setOf(
        "doubleclick.net", "googlesyndication.com", "google-analytics.com", "googletagmanager.com",
        "googletagservices.com", "googleadservices.com", "adservice.google.com", "2mdn.net",
        "app-measurement.com", "pagead2.googlesyndication.com",
        "doubleverify.com", "adsafeprotected.com", "moatads.com", "amazon-adsystem.com",
        "adnxs.com", "ib.adnxs.com", "pubmatic.com", "rubiconproject.com", "openx.net", "casalemedia.com",
        "adsrvr.org", "bidswitch.net", "yieldmo.com", "mathtag.com", "adform.net", "smartadserver.com",
        "zedo.com", "serving-sys.com", "advertising.com", "3lift.com", "sonobi.com", "indexww.com",
        "districtm.io", "improvedigital.com", "yieldlab.net", "lijit.com", "sovrn.com", "onetag-sys.com",
        "gumgum.com", "contextweb.com", "sharethrough.com", "teads.tv", "spotxchange.com", "spotx.tv",
        "smartclip.net", "stickyadstv.com", "loopme.com", "innovid.com", "rfihub.com", "adroll.com",
        "tapad.com", "turn.com", "simpli.fi", "media.net", "yieldmanager.com", "adtechus.com",
        "taboola.com", "cdn.taboola.com", "outbrain.com", "revcontent.com", "mgid.com", "adblade.com",
        "bluekai.com", "demdex.net", "krxd.net", "rlcdn.com", "agkn.com", "mookie1.com", "exelator.com",
        "adsymptotic.com", "everesttech.net", "criteo.com", "criteo.net",
        "scorecardresearch.com", "quantserve.com", "quantcount.com", "comscore.com", "cxense.com",
        "hotjar.com", "mixpanel.com", "segment.com", "segment.io", "amplitude.com", "fullstory.com",
        "mouseflow.com", "crazyegg.com", "newrelic.com", "nr-data.net", "chartbeat.com", "parsely.com",
        "branch.io", "appsflyer.com", "adjust.com", "kochava.com", "addthis.com", "sharethis.com",
        "omtrdc.net", "2o7.net", "gemius.pl", "hotjar.io",
        "bat.bing.com", "clarity.ms", "atdmt.com", "ads.yahoo.com", "analytics.yahoo.com",
        "connect.facebook.net", "ads-twitter.com", "ads.linkedin.com", "snap.licdn.com",
        "ads.tiktok.com", "analytics.tiktok.com",
        "mc.yandex.ru", "an.yandex.ru", "adfox.ru",
        "adcolony.com", "applovin.com", "unityads.unity3d.com", "vungle.com", "inmobi.com",
        "mopub.com", "chartboost.com", "startappservice.com", "flurry.com", "supersonicads.com",
        "tapjoy.com", "smaato.net", "mobfox.com", "fyber.com",
        "adcash.com", "propellerads.com", "popads.net", "popcash.net", "exoclick.com", "juicyads.com",
        "plugrush.com", "adsterra.com", "hilltopads.net", "clickadu.com", "trafficstars.com"
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        container = findViewById(R.id.webContainer)
        address = findViewById(R.id.address)
        progress = findViewById(R.id.progress)
        shieldsView = findViewById(R.id.shields)
        tabCountView = findViewById(R.id.tabCount)
        tabSwitcher = findViewById(R.id.tabSwitcher)
        tabList = findViewById(R.id.tabList)
        backView = findViewById(R.id.back)
        forwardView = findViewById(R.id.forward)

        CookieManager.getInstance().setAcceptCookie(true)

        backView.setOnClickListener { current?.web?.let { if (it.canGoBack()) it.goBack() } }
        forwardView.setOnClickListener { current?.web?.let { if (it.canGoForward()) it.goForward() } }
        findViewById<View>(R.id.home).setOnClickListener { current?.web?.let { loadStart(it); address.setText("") } }
        findViewById<View>(R.id.reload).setOnClickListener { current?.web?.reload() }
        shieldsView.setOnClickListener { toggleShields() }
        findViewById<View>(R.id.menu).setOnClickListener { showMenu(it) }
        tabCountView.setOnClickListener { showTabSwitcher() }
        findViewById<View>(R.id.switcherNew).setOnClickListener { addTab(null); hideTabSwitcher() }
        findViewById<View>(R.id.switcherClose).setOnClickListener { hideTabSwitcher() }

        address.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_GO) {
                navigate(address.text.toString()); hideKeyboard(); true
            } else false
        }
        address.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                if (address.hasFocus()) updateAddressSuggestions(s?.toString().orEmpty())
            }
            override fun afterTextChanged(s: Editable?) = Unit
        })
        address.setOnItemClickListener { _, _, position, _ ->
            val label = address.adapter.getItem(position)?.toString().orEmpty()
            val target = addressTargets[label] ?: label.substringAfterLast("\n", label)
            navigate(target)
            hideKeyboard()
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                when {
                    isSwitcherOpen() -> hideTabSwitcher()
                    customView != null -> exitFullscreen()
                    current?.web?.canGoBack() == true -> current?.web?.goBack()
                    tabs.size > 1 -> current?.let { closeTab(it) }
                    else -> finish()
                }
            }
        })

        if (Build.VERSION.SDK_INT <= 28 &&
            checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE), 1)
        }

        Notifier.ensureChannel(this)
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 2)
        }
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "arda-tips", ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<TipWorker>(6, TimeUnit.HOURS).build()
        )
        WorkManager.getInstance(this).enqueue(
            OneTimeWorkRequestBuilder<TipWorker>().setInitialDelay(20, TimeUnit.SECONDS).build()
        )

        restoreSession()
        if (intent?.action == "CLOSE_PRIVATE") closeAllPrivateTabs()
        updateShieldsLabel()
        updateTabCount()
        updateNavButtons()
        updatePrivateNotification()
    }

    override fun onPause() {
        super.onPause()
        saveSession()
        CookieManager.getInstance().flush()
    }

    private fun saveSession() {
        val arr = JSONArray()
        for (t in tabs) {
            if (t.priv) continue
            val u = t.web.url
            arr.put(if (u != null && u.startsWith("http")) u else "home")
        }
        prefs.edit().putString("session", arr.toString())
            .putInt("activeIdx", tabs.indexOf(current).coerceAtLeast(0)).apply()
    }

    private fun restoreSession() {
        val sess = try { JSONArray(prefs.getString("session", "[]")) } catch (e: Exception) { JSONArray() }
        if (sess.length() == 0) { addTab(null); return }
        for (i in 0 until sess.length()) {
            val u = sess.optString(i)
            if (u.isEmpty() || u == "home") addTab(null) else addTab(u)
        }
        val idx = prefs.getInt("activeIdx", 0).coerceIn(0, tabs.size - 1)
        if (tabs.isNotEmpty()) selectTab(tabs[idx])
    }

    // ---------- WebView ----------
    @SuppressLint("SetJavaScriptEnabled")
    private fun createWebView(priv: Boolean): WebView {
        val web = WebView(this)
        web.layoutParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT
        )
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            useWideViewPort = true
            loadWithOverviewMode = true
            builtInZoomControls = true
            displayZoomControls = false
            setSupportZoom(true)
            mediaPlaybackRequiresUserGesture = false
            javaScriptCanOpenWindowsAutomatically = true
            setSupportMultipleWindows(true)
            databaseEnabled = true
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            cacheMode = if (priv) WebSettings.LOAD_NO_CACHE else WebSettings.LOAD_DEFAULT
            userAgentString = CHROME_UA
        }
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, !priv)

        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? {
                val req = request ?: return null
                val u = req.url?.toString() ?: return null
                if (shieldsOn && !req.isForMainFrame && isBlocked(u)) {
                    blocked++
                    runOnUiThread { updateShieldsLabel() }
                    return WebResourceResponse("text/plain", "utf-8", ByteArrayInputStream(ByteArray(0)))
                }
                return null
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return false
                val u = uri.toString()
                if (u.startsWith("http://") || u.startsWith("https://")) return false
                if (u.startsWith("intent:")) {
                    return try {
                        startActivity(Intent.parseUri(u, Intent.URI_INTENT_SCHEME)); true
                    } catch (e: Exception) {
                        try {
                            val parsed = Intent.parseUri(u, Intent.URI_INTENT_SCHEME)
                            val fb = parsed.getStringExtra("browser_fallback_url")
                            when {
                                fb != null -> view?.loadUrl(fb)
                                parsed.`package` != null -> startActivity(
                                    Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=${parsed.`package`}"))
                                )
                            }
                        } catch (e2: Exception) { }
                        true
                    }
                }
                return try { startActivity(Intent(Intent.ACTION_VIEW, uri)); true } catch (e: Exception) { true }
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                if (tabFor(view) == current) { if (!address.hasFocus()) address.setText(displayUrl(url)); updateNavButtons() }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                val t = tabFor(view) ?: return
                view?.title?.let { t.title = it }
                if (t == current) { if (!address.hasFocus()) address.setText(displayUrl(url)); updateNavButtons() }
                if (!t.priv && url != null && url.startsWith("http")) { addHistory(view?.title ?: url, url); saveSession() }
                refreshSwitcherIfOpen()
            }
        }

        web.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (tabFor(view) == current) {
                    progress.progress = newProgress
                    progress.visibility = if (newProgress in 1..99) View.VISIBLE else View.GONE
                }
            }
            override fun onReceivedTitle(view: WebView?, title: String?) {
                val t = tabFor(view) ?: return
                if (!title.isNullOrBlank()) { t.title = title; refreshSwitcherIfOpen() }
            }
            override fun onCreateWindow(view: WebView?, isDialog: Boolean, isUserGesture: Boolean, resultMsg: Message?): Boolean {
                val newTab = addTab(null, current?.priv ?: false, loadHome = false)
                val transport = resultMsg?.obj as? WebView.WebViewTransport
                transport?.webView = newTab.web
                resultMsg?.sendToTarget()
                return true
            }
            override fun onShowFileChooser(webView: WebView?, callback: ValueCallback<Array<Uri>>?, params: FileChooserParams?): Boolean {
                filePathCallback?.onReceiveValue(null)
                filePathCallback = callback
                val intent = params?.createIntent() ?: run { filePathCallback = null; return false }
                return try { fileChooser.launch(intent); true } catch (e: Exception) { filePathCallback = null; false }
            }
            override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                if (customView != null || view == null) { callback?.onCustomViewHidden(); return }
                customView = view
                customViewCallback = callback
                (window.decorView as FrameLayout).addView(
                    view, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
                )
                window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                hideSystemBars()
            }
            override fun onHideCustomView() { exitFullscreen() }
        }
        web.setDownloadListener { dlUrl, ua, contentDisposition, mime, _ ->
            startDownload(dlUrl, ua, contentDisposition, mime)
        }
        web.setOnLongClickListener {
            val hit = web.hitTestResult ?: return@setOnLongClickListener false
            val target = hit.extra
            when (hit.type) {
                WebView.HitTestResult.IMAGE_TYPE,
                WebView.HitTestResult.SRC_IMAGE_ANCHOR_TYPE -> {
                    if (!target.isNullOrBlank()) showImageMenu(web, target) else return@setOnLongClickListener false
                    true
                }
                WebView.HitTestResult.SRC_ANCHOR_TYPE -> {
                    if (!target.isNullOrBlank()) showLinkMenu(target) else return@setOnLongClickListener false
                    true
                }
                else -> false
            }
        }
        return web
    }

    private fun showImageMenu(web: WebView, url: String) {
        AlertDialog.Builder(this)
            .setTitle("Resim")
            .setItems(arrayOf("Orijinal boyutta indir", "Resim adresini kopyala", "Yeni sekmede aç")) { _, which ->
                when (which) {
                    0 -> startDownload(url, web.settings.userAgentString, null, "image/*", web.url)
                    1 -> copyText(url)
                    2 -> addTab(url)
                }
            }.show()
    }

    private fun showLinkMenu(url: String) {
        AlertDialog.Builder(this)
            .setTitle("Bağlantı")
            .setItems(arrayOf("Yeni sekmede aç", "Bağlantıyı kopyala", "Bağlantıyı indir")) { _, which ->
                when (which) {
                    0 -> addTab(url)
                    1 -> copyText(url)
                    2 -> startDownload(url, current?.web?.settings?.userAgentString, null, null, current?.web?.url)
                }
            }.show()
    }

    private fun copyText(text: String) {
        (getSystemService(CLIPBOARD_SERVICE) as ClipboardManager)
            .setPrimaryClip(ClipData.newPlainText("Arda Browser", text))
        Toast.makeText(this, "Kopyalandı", Toast.LENGTH_SHORT).show()
    }

    private fun startDownload(url: String, ua: String?, contentDisposition: String?, mime: String?, referer: String? = null) {
        try {
            if (!url.startsWith("http")) { Toast.makeText(this, "Bu dosya indirilemez", Toast.LENGTH_SHORT).show(); return }
            val fileName = URLUtil.guessFileName(url, contentDisposition, mime)
            val req = DownloadManager.Request(Uri.parse(url))
            req.setMimeType(mime)
            ua?.let { req.addRequestHeader("User-Agent", it) }
            CookieManager.getInstance().getCookie(url)?.let { req.addRequestHeader("Cookie", it) }
            referer?.takeIf { it.startsWith("http") }?.let { req.addRequestHeader("Referer", it) }
            req.setTitle(fileName)
            req.setDescription("Arda Browser")
            req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            req.setAllowedOverMetered(true)
            req.setAllowedOverRoaming(true)
            req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
            val id = (getSystemService(DOWNLOAD_SERVICE) as DownloadManager).enqueue(req)
            val a = arr("downloads"); val out = JSONArray()
            out.put(JSONObject().put("name", fileName).put("url", url).put("id", id).put("time", System.currentTimeMillis()))
            var c = 0
            for (i in 0 until a.length()) { if (c >= 100) break; out.put(a.getJSONObject(i)); c++ }
            save("downloads", out)
            Toast.makeText(this, "İndiriliyor: $fileName", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            Toast.makeText(this, "İndirme başlatılamadı", Toast.LENGTH_SHORT).show()
        }
    }

    private fun toggleDesktop() {
        val t = current ?: return
        t.desktop = !t.desktop
        t.web.settings.userAgentString = if (t.desktop) DESKTOP_UA else CHROME_UA
        t.web.settings.useWideViewPort = true
        t.web.settings.loadWithOverviewMode = true
        // YouTube vb. 'm.' mobil alt alan adindan www.'ye gec (yoksa reload yetmez)
        var navigated = false
        val url = t.web.url
        if (t.desktop && url != null) {
            try {
                val h = java.net.URI(url).host ?: ""
                if (h.startsWith("m.")) {
                    t.web.loadUrl(url.replaceFirst("://$h", "://www." + h.substring(2)))
                    navigated = true
                }
            } catch (e: Exception) {}
        }
        if (!navigated) t.web.reload()
        Toast.makeText(this, if (t.desktop) "Masaüstü site açık — tam kalite" else "Mobil siteye dönüldü", Toast.LENGTH_SHORT).show()
    }

    private fun translatePage() {
        val url = current?.web?.url
        if (url == null || !url.startsWith("http")) { Toast.makeText(this, "Çevrilecek sayfa yok", Toast.LENGTH_SHORT).show(); return }
        try {
            val uri = java.net.URI(url)
            val host = uri.host ?: return
            if (host.endsWith(".translate.goog")) { Toast.makeText(this, "Sayfa zaten çevrildi", Toast.LENGTH_SHORT).show(); return }
            val tHost = host.replace("-", "--").replace(".", "-") + ".translate.goog"
            val path = if (uri.rawPath.isNullOrEmpty()) "/" else uri.rawPath
            val q = uri.rawQuery
            val lang = transLang()
            val full = StringBuilder("https://").append(tHost).append(path).append("?")
            if (!q.isNullOrEmpty()) full.append(q).append("&")
            full.append("_x_tr_sl=auto&_x_tr_tl=$lang&_x_tr_hl=$lang")
            current?.web?.loadUrl(full.toString())
        } catch (e: Exception) {
            Toast.makeText(this, "Çeviri açılamadı", Toast.LENGTH_SHORT).show()
        }
    }

    private fun isBlocked(url: String): Boolean {
        return try {
            val host = URI(url).host ?: return false
            BLOCKLIST.any { host == it || host.endsWith(".$it") }
        } catch (e: Exception) { false }
    }

    // ---------- Sekmeler ----------
    private fun addTab(url: String?, priv: Boolean = false, loadHome: Boolean = true): Tab {
        val web = createWebView(priv)
        val tab = Tab(web, priv = priv)
        tabs.add(tab)
        selectTab(tab)
        when {
            url != null -> web.loadUrl(url)
            loadHome -> loadStart(web)
        }
        updateTabCount()
        updatePrivateNotification()
        return tab
    }

    private fun selectTab(tab: Tab) {
        current = tab
        container.removeAllViews()
        (tab.web.parent as? android.view.ViewGroup)?.removeView(tab.web)
        container.addView(tab.web)
        applyChrome(tab.priv)
        if (!address.hasFocus()) address.setText(displayUrl(tab.web.url))
        updateTabCount()
        updateNavButtons()
    }

    private fun closeTab(tab: Tab) {
        val i = tabs.indexOf(tab)
        if (i == -1) return
        tabs.removeAt(i)
        if (container.childCount > 0 && container.getChildAt(0) === tab.web) container.removeView(tab.web)
        if (tab.priv) { tab.web.clearHistory(); tab.web.clearFormData() }
        tab.web.destroy()
        if (current == tab) {
            if (tabs.isEmpty()) { addTab(null); return }
            selectTab(tabs[(i - 1).coerceAtLeast(0)])
        }
        updateTabCount()
        updatePrivateNotification()
        saveSession()
    }

    private fun updateTabCount() { tabCountView.text = tabs.size.toString() }

    private fun updateNavButtons() {
        val w = current?.web
        backView.alpha = if (w?.canGoBack() == true) 1f else 0.3f
        forwardView.alpha = if (w?.canGoForward() == true) 1f else 0.3f
    }

    // Gizli sekmede arayuzu koyu/siyah yap (incognito gorunumu)
    private fun applyChrome(priv: Boolean) {
        val barBg = if (priv) 0xFF1B1B1F.toInt() else 0xFFFFFFFF.toInt()
        val pillBg = if (priv) 0xFF2D2D33.toInt() else 0xFFF1F3F4.toInt()
        val ink = if (priv) 0xFFECECEC.toInt() else 0xFF202124.toInt()
        val muted = if (priv) 0xFFAAAAB4.toInt() else 0xFF5F6368.toInt()
        findViewById<View>(R.id.toolbar).setBackgroundColor(barBg)
        findViewById<View>(R.id.urlbar).background =
            GradientDrawable().apply { cornerRadius = dp(22).toFloat(); setColor(pillBg) }
        address.setTextColor(ink); address.setHintTextColor(muted)
        findViewById<TextView>(R.id.reload).setTextColor(muted)
        findViewById<TextView>(R.id.menu).setTextColor(ink)
        findViewById<TextView>(R.id.home).setTextColor(ink)
        backView.setTextColor(ink); forwardView.setTextColor(ink)
        tabCountView.setTextColor(ink)
        tabCountView.background =
            GradientDrawable().apply { cornerRadius = dp(7).toFloat(); setColor(0x00000000); setStroke(dp(2), ink) }
        window.statusBarColor = barBg
        WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = !priv
    }

    private val PRIVATE_NOTIF_ID = 4242
    private fun updatePrivateNotification() {
        val nm = NotificationManagerCompat.from(this)
        val count = tabs.count { it.priv }
        if (count == 0) { nm.cancel(PRIVATE_NOTIF_ID); return }
        Notifier.ensurePrivateChannel(this)
        val intent = Intent(this, MainActivity::class.java)
            .setAction("CLOSE_PRIVATE")
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val pi = PendingIntent.getActivity(this, 1, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val n = NotificationCompat.Builder(this, "arda_private")
            .setSmallIcon(R.drawable.ic_notif)
            .setContentTitle("🕶 Gizli sekme açık ($count)")
            .setContentText("Gizli sekmeleri kapatmak için dokun")
            .setOngoing(true).setAutoCancel(false).setContentIntent(pi)
            .build()
        try { nm.notify(PRIVATE_NOTIF_ID, n) } catch (e: SecurityException) {}
    }

    private fun closeAllPrivateTabs() {
        tabs.filter { it.priv }.forEach { closeTab(it) }
        updatePrivateNotification()
        if (isSwitcherOpen()) buildTabList()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.action == "CLOSE_PRIVATE") closeAllPrivateTabs()
    }

    private fun tabFor(view: WebView?): Tab? = tabs.firstOrNull { it.web === view }

    // ---------- Sekme degistirici ----------
    private fun isSwitcherOpen() = tabSwitcher.visibility == View.VISIBLE

    private fun showTabSwitcher() {
        buildTabList()
        tabSwitcher.visibility = View.VISIBLE
        tabSwitcher.alpha = 0f
        tabSwitcher.animate().alpha(1f).setDuration(150).start()
    }

    private fun hideTabSwitcher() {
        tabSwitcher.animate().alpha(0f).setDuration(120).withEndAction { tabSwitcher.visibility = View.GONE }.start()
    }

    private fun refreshSwitcherIfOpen() { if (isSwitcherOpen()) buildTabList() }

    private fun buildTabList() {
        tabList.removeAllViews()
        for (t in tabs) {
            val card = LinearLayout(this)
            card.orientation = LinearLayout.HORIZONTAL
            card.gravity = Gravity.CENTER_VERTICAL
            val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(58))
            lp.bottomMargin = dp(10)
            card.layoutParams = lp
            card.setPadding(dp(15), 0, dp(8), 0)
            card.background = ContextCompat.getDrawable(this, if (t == current) R.drawable.tabcard_active else R.drawable.tabcard_bg)

            val title = TextView(this)
            title.layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            title.maxLines = 1
            title.ellipsize = TextUtils.TruncateAt.END
            title.textSize = 14f
            title.setTextColor(0xFF202124.toInt())
            title.text = (if (t.priv) "🕶  " else "") + t.title.ifBlank { "Yeni sekme" }

            val close = TextView(this)
            close.text = "✕"; close.textSize = 16f
            close.setTextColor(0xFF5F6368.toInt())
            close.setPadding(dp(12), dp(8), dp(6), dp(8))
            close.setOnClickListener {
                val wasLast = tabs.size == 1
                closeTab(t)               // son sekmeyse yeni bos sekme acilir (tarayici kapanmaz)
                if (wasLast) hideTabSwitcher() else buildTabList()
            }

            card.addView(title); card.addView(close)
            card.setOnClickListener { selectTab(t); hideTabSwitcher() }
            tabList.addView(card)
        }
    }

    // ---------- Navigasyon ----------
    private fun navigate(input: String) {
        val url = normalize(input) ?: return
        current?.web?.loadUrl(url)
    }

    private fun normalize(textIn: String): String? {
        val text = textIn.trim()
        if (text.isEmpty()) return null
        if (Regex("^(https?|file|about):", RegexOption.IGNORE_CASE).containsMatchIn(text)) return text
        if (Regex("^localhost(:\\d+)?(/.*)?$", RegexOption.IGNORE_CASE).matches(text)) return "http://$text"
        if (!text.contains(" ") && Regex("^[^\\s.]+\\.[^\\s]{2,}(/.*)?$").matches(text)) return "https://$text"
        return searchUrl(text)
    }

    private fun searchUrl(q: String): String {
        val e = prefs.getString("engine", "ddg")
        val enc = java.net.URLEncoder.encode(q, "UTF-8")
        return when (e) {
            "google" -> "https://www.google.com/search?q=$enc"
            "bing" -> "https://www.bing.com/search?q=$enc"
            else -> "https://duckduckgo.com/?q=$enc"
        }
    }

    private fun displayUrl(url: String?): String {
        if (url == null) return ""
        if (url.startsWith("data:") || url == "about:blank") return ""
        return url
    }

    // ---------- Shields ----------
    private fun toggleShields() { shieldsOn = !shieldsOn; updateShieldsLabel() }
    private fun updateShieldsLabel() {
        shieldsView.text = "🛡 $blocked"
        shieldsView.alpha = if (shieldsOn) 1f else 0.4f
    }

    // ---------- Yer imleri / Gecmis ----------
    private fun arr(key: String): JSONArray = try { JSONArray(prefs.getString(key, "[]")) } catch (e: Exception) { JSONArray() }
    private fun save(key: String, a: JSONArray) = prefs.edit().putString(key, a.toString()).apply()

    private fun addHistory(title: String, url: String) {
        val a = arr("history")
        val out = JSONArray()
        out.put(JSONObject().put("t", title).put("u", url))
        var c = 0
        for (i in 0 until a.length()) {
            if (c >= 300) break
            val o = a.getJSONObject(i)
            if (o.optString("u") == url) continue
            out.put(o); c++
        }
        save("history", out)
    }

    private fun updateAddressSuggestions(raw: String) {
        val query = raw.trim().lowercase()
        if (query.isEmpty()) return
        addressTargets.clear()
        fun collect(key: String) {
            val a = arr(key)
            for (i in 0 until a.length()) {
                val o = a.optJSONObject(i) ?: continue
                val title = o.optString("t")
                val url = o.optString("u")
                if (url.isBlank() || (!title.lowercase().contains(query) && !url.lowercase().contains(query))) continue
                val label = "🌐  ${title.ifBlank { url }}\n$url"
                addressTargets.putIfAbsent(label, url)
                if (addressTargets.size >= 7) return
            }
        }
        collect("bookmarks")
        collect("history")
        val searchLabel = "🔎  $raw"
        addressTargets.putIfAbsent(searchLabel, raw)
        address.setAdapter(ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, addressTargets.keys.toList()))
        if (address.hasFocus()) address.showDropDown()
    }

    private fun hasBookmark(url: String): Boolean {
        val a = arr("bookmarks")
        for (i in 0 until a.length()) if (a.getJSONObject(i).optString("u") == url) return true
        return false
    }

    private fun toggleBookmark() {
        val url = current?.web?.url ?: return
        if (displayUrl(url).isEmpty()) return
        val a = arr("bookmarks"); val out = JSONArray(); var removed = false
        for (i in 0 until a.length()) {
            val o = a.getJSONObject(i)
            if (o.optString("u") == url) { removed = true } else out.put(o)
        }
        if (!removed) out.put(JSONObject().put("t", current?.web?.title ?: url).put("u", url))
        save("bookmarks", out)
        Toast.makeText(this, if (removed) "Yer iminden çıkarıldı" else "Yer imine eklendi", Toast.LENGTH_SHORT).show()
    }

    private fun showList(title: String, key: String) {
        val a = arr(key)
        if (a.length() == 0) { Toast.makeText(this, "Liste boş", Toast.LENGTH_SHORT).show(); return }
        val labels = Array(a.length()) { i -> a.getJSONObject(i).optString("t").ifBlank { a.getJSONObject(i).optString("u") } }
        val urls = Array(a.length()) { i -> a.getJSONObject(i).optString("u") }
        AlertDialog.Builder(this)
            .setTitle(title)
            .setItems(labels) { _, which -> current?.web?.loadUrl(urls[which]) }
            .setNegativeButton("Kapat", null)
            .setNeutralButton("Temizle") { _, _ -> save(key, JSONArray()) }
            .show()
    }

    private fun showDownloads() {
        val a = arr("downloads")
        if (a.length() == 0) {
            AlertDialog.Builder(this).setTitle("İndirilenler")
                .setMessage("Henüz indirme yok.").setPositiveButton("Tamam", null).show()
            return
        }
        val dm = getSystemService(DOWNLOAD_SERVICE) as DownloadManager
        val labels = ArrayList<String>()
        val uris = ArrayList<Uri?>()
        val mimes = ArrayList<String?>()
        for (i in 0 until a.length()) {
            val o = a.getJSONObject(i)
            val name = o.optString("name")
            val id = o.optLong("id", -1)
            var status = ""
            var uri: Uri? = null
            var mime: String? = null
            if (id >= 0) {
                try {
                    val cur = dm.query(DownloadManager.Query().setFilterById(id))
                    if (cur.moveToFirst()) {
                        when (cur.getInt(cur.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))) {
                            DownloadManager.STATUS_SUCCESSFUL -> status = "✓ Tamamlandı"
                            DownloadManager.STATUS_RUNNING -> status = "↓ İniyor…"
                            DownloadManager.STATUS_PENDING -> status = "… Bekliyor"
                            DownloadManager.STATUS_PAUSED -> status = "⏸ Duraklatıldı"
                            DownloadManager.STATUS_FAILED -> status = "✗ Başarısız"
                        }
                        cur.getString(cur.getColumnIndexOrThrow(DownloadManager.COLUMN_LOCAL_URI))?.let { uri = Uri.parse(it) }
                        mime = cur.getString(cur.getColumnIndexOrThrow(DownloadManager.COLUMN_MEDIA_TYPE))
                    } else status = "(silinmiş)"
                    cur.close()
                } catch (e: Exception) { status = "" }
            }
            labels.add(if (status.isEmpty()) name else "$name\n$status")
            uris.add(uri); mimes.add(mime)
        }
        AlertDialog.Builder(this)
            .setTitle("İndirilenler")
            .setItems(labels.toTypedArray()) { _, which ->
                val u = uris[which]
                if (u != null) {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW)
                            .setDataAndType(u, mimes[which] ?: "*/*")
                            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION))
                    } catch (e: Exception) {
                        Toast.makeText(this, "Açacak uygulama bulunamadı", Toast.LENGTH_SHORT).show()
                    }
                } else Toast.makeText(this, "Dosya henüz hazır değil", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Kapat", null)
            .setNeutralButton("Listeyi temizle") { _, _ -> save("downloads", JSONArray()) }
            .show()
    }

    private fun showMenu(anchor: View) {
        val p = PopupMenu(this, anchor)
        p.menu.add(0, 1, 0, "＋  Yeni sekme")
        p.menu.add(0, 2, 1, "🕶  Yeni gizli sekme")
        val url = current?.web?.url
        val isBm = url != null && hasBookmark(url)
        p.menu.add(0, 3, 5, if (isBm) "★  Yer iminden çıkar" else "☆  Yer imine ekle")
        p.menu.add(0, 9, 6, "🌐  ${transLangName()} diline çevir")
        p.menu.add(0, 11, 7, if (current?.desktop == true) "📱  Mobil site" else "🖥  Masaüstü site (tam kalite)")
        p.menu.add(0, 6, 8, "🔍  Sayfada bul")
        p.menu.add(0, 4, 9, "★  Yer imleri")
        p.menu.add(0, 5, 10, "🕘  Geçmiş")
        p.menu.add(0, 10, 11, "⬇  İndirilenler")
        p.menu.add(0, 7, 12, "↗  Paylaş")
        p.menu.add(0, 8, 13, "⚙  Ayarlar")
        p.setOnMenuItemClickListener { mi ->
            when (mi.itemId) {
                1 -> addTab(null)
                2 -> addTab(null, priv = true)
                3 -> toggleBookmark()
                4 -> showList("Yer imleri", "bookmarks")
                5 -> showList("Geçmiş", "history")
                6 -> showFind()
                7 -> shareUrl()
                8 -> showSettings()
                9 -> translatePage()
                10 -> showDownloads()
                11 -> toggleDesktop()
            }
            true
        }
        p.show()
    }

    private fun showFind() {
        val input = EditText(this); input.hint = "Sayfada bul"
        AlertDialog.Builder(this)
            .setTitle("Sayfada bul")
            .setView(input)
            .setPositiveButton("Bul") { _, _ -> current?.web?.findAllAsync(input.text.toString()) }
            .setNeutralButton("Sonraki") { _, _ -> current?.web?.findNext(true) }
            .setNegativeButton("Kapat") { _, _ -> current?.web?.clearMatches() }
            .show()
    }

    private fun shareUrl() {
        val url = current?.web?.url ?: return
        val i = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, url)
        startActivity(Intent.createChooser(i, "Paylaş"))
    }

    private fun showSettings() {
        AlertDialog.Builder(this)
            .setTitle("Ayarlar")
            .setItems(arrayOf("🔎  Arama motoru", "🌐  Çeviri dili")) { _, which ->
                if (which == 0) showEnginePicker() else showLangPicker()
            }
            .setNegativeButton("Kapat", null)
            .show()
    }

    private fun showEnginePicker() {
        val engines = arrayOf("DuckDuckGo", "Google", "Bing")
        val codes = arrayOf("ddg", "google", "bing")
        val cur = codes.indexOf(prefs.getString("engine", "ddg")).coerceAtLeast(0)
        AlertDialog.Builder(this)
            .setTitle("Arama motoru")
            .setSingleChoiceItems(engines, cur) { d, which -> prefs.edit().putString("engine", codes[which]).apply(); d.dismiss() }
            .setNegativeButton("Kapat", null)
            .show()
    }

    private val LANG_NAMES = arrayOf("📱 Sistem dili", "Türkçe", "İngilizce", "Yunanca", "Almanca", "Fransızca", "İspanyolca", "İtalyanca", "Rusça", "Arapça", "Çince", "Portekizce", "Japonca", "Korece", "Hintçe")
    private val LANG_CODES = arrayOf("system", "tr", "en", "el", "de", "fr", "es", "it", "ru", "ar", "zh-CN", "pt", "ja", "ko", "hi")

    private fun showLangPicker() {
        val cur = LANG_CODES.indexOf(prefs.getString("transLang", "system")).coerceAtLeast(0)
        AlertDialog.Builder(this)
            .setTitle("Çeviri dili")
            .setSingleChoiceItems(LANG_NAMES, cur) { d, which -> prefs.edit().putString("transLang", LANG_CODES[which]).apply(); d.dismiss() }
            .setNegativeButton("Kapat", null)
            .show()
    }

    private fun transLang(): String {
        val pref = prefs.getString("transLang", "system")
        return if (pref == "system") java.util.Locale.getDefault().language else (pref ?: "tr")
    }

    private fun transLangName(): String {
        val i = LANG_CODES.indexOf(prefs.getString("transLang", "system"))
        return if (i >= 0) LANG_NAMES[i].removePrefix("📱 ") else "Sistem dili"
    }

    private fun loadStart(web: WebView) {
        web.loadDataWithBaseURL(null, START_HTML, "text/html", "UTF-8", null)
    }

    private fun hideKeyboard() {
        val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
        imm.hideSoftInputFromWindow(address.windowToken, 0)
        address.clearFocus()
    }

    private fun exitFullscreen() {
        val decor = window.decorView as? FrameLayout ?: return
        customView?.let { decor.removeView(it) }
        customView = null
        customViewCallback?.onCustomViewHidden()
        customViewCallback = null
        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        showSystemBars()
    }

    private fun hideSystemBars() {
        val c = WindowInsetsControllerCompat(window, window.decorView)
        c.hide(WindowInsetsCompat.Type.systemBars())
        c.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    }

    private fun showSystemBars() {
        WindowInsetsControllerCompat(window, window.decorView).show(WindowInsetsCompat.Type.systemBars())
    }

    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()

    companion object {
        private const val CHROME_UA =
            "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
        private const val DESKTOP_UA =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

        private const val START_HTML = """
<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:sans-serif}
body{background:#ffffff;color:#202124;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center}
.brand{font-size:27px;font-weight:300;letter-spacing:5px;margin-bottom:14px;color:#202124}.brand span{color:#fb542b;font-weight:600}
.emblem{font-size:60px;line-height:1;margin-bottom:18px}
.sub{color:#b0b4ba;font-size:10px;letter-spacing:2px;margin-bottom:24px}
form{width:90vw;display:flex;border-radius:26px;box-shadow:0 3px 14px rgba(0,0,0,.08)}
input{flex:1;padding:14px 18px;font-size:16px;border:1px solid #e5e7eb;border-right:none;border-radius:26px 0 0 26px;background:#f7f8fa;color:#202124;outline:none}
button{padding:0 20px;border:none;background:#fb542b;color:#fff;border-radius:0 26px 26px 0;font-size:16px}
.duckai{margin-top:14px;display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:22px;background:#f7f8fa;border:1px solid #e5e7eb;color:#202124;text-decoration:none;font-size:13px}
.links{display:flex;gap:12px;margin-top:24px;flex-wrap:wrap;justify-content:center}
a.tile{width:78px;height:70px;border-radius:14px;background:#f7f8fa;border:1px solid #e5e7eb;text-decoration:none;color:#202124;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;font-size:11px}
a.tile .e{font-size:24px}
.foot{position:fixed;bottom:16px;color:#c2c6cc;font-size:10px}
</style></head><body>
<div class="brand">ARDA <span>BROWSER</span></div>
<div class="emblem">&#129517;</div>
<div class="sub">GIZLILIGIN KORUNDUGU TARAYICI</div>
<form action="https://duckduckgo.com/"><input name="q" placeholder="Ara veya adres gir"><button type="submit">Ara</button></form>
<a class="duckai" href="https://duck.ai">&#129414; Duck.ai ile sohbet et</a>
<div class="links">
<a class="tile" href="https://m.youtube.com"><span class="e">&#9654;</span>YouTube</a>
<a class="tile" href="https://www.google.com"><span class="e">&#128269;</span>Google</a>
<a class="tile" href="https://github.com"><span class="e">&#128025;</span>GitHub</a>
<a class="tile" href="https://www.wikipedia.org"><span class="e">&#128218;</span>Wiki</a>
</div>
<div class="foot">&#128737; Reklam ve izleyici engelleme acik</div>
</body></html>
"""
    }
}
