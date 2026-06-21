const { app, BrowserWindow, session, ipcMain, Menu, clipboard, net } = require("electron");
const path = require("path");

// Eski/sabit bir Chrome surumu Google oturum acma sayfalarinda
// "bu tarayici guvenli olmayabilir" hatasina yol acabiliyor. Electron'un
// beraberinde gelen gercek Chromium surumunu kullan ve Electron imzasini UA'dan kaldir.
const CHROME_UA =
  `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ` +
  `(KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
const GOOGLE_AUTH_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0";

app.userAgentFallback = CHROME_UA;

let mainWindow;
let shieldsEnabled = true;
let blockedCount = 0;

// Windows gorev cubugunda uygulamanin kendi ikonunun kullanilmasini saglar.
if (process.platform === "win32") app.setAppUserModelId("com.arda.browser");

// Brave Shields benzeri yerlesik reklam/izleyici alan adi listesi.
const BLOCKLIST = [
  "doubleclick.net", "googlesyndication.com", "google-analytics.com", "googletagmanager.com",
  "googletagservices.com", "googleadservices.com", "adservice.google.com", "pagead2.googlesyndication.com",
  "2mdn.net", "doubleverify.com", "adsafeprotected.com", "moatads.com",
  "connect.facebook.net", "facebook.com/tr", "amazon-adsystem.com", "adnxs.com",
  "taboola.com", "outbrain.com", "criteo.com", "criteo.net", "scorecardresearch.com",
  "quantserve.com", "quantcount.com", "pubmatic.com", "rubiconproject.com", "openx.net",
  "casalemedia.com", "adsrvr.org", "bidswitch.net", "yieldmo.com", "mathtag.com",
  "adform.net", "smartadserver.com", "zedo.com", "serving-sys.com", "advertising.com",
  "bluekai.com", "demdex.net", "krxd.net", "rlcdn.com", "agkn.com", "mookie1.com",
  "sharethrough.com", "contextweb.com", "gumgum.com", "teads.tv", "spotxchange.com",
  "3lift.com", "sonobi.com", "indexww.com", "districtm.io", "gw.adspeed.net",
  "hotjar.com", "mixpanel.com", "segment.com", "segment.io", "amplitude.com",
  "fullstory.com", "mouseflow.com", "crazyegg.com", "optimizely.com", "newrelic.com",
  "nr-data.net", "bugsnag.com", "branch.io", "appsflyer.com", "adjust.com",
  "kochava.com", "chartbeat.com", "parsely.com", "addthis.com", "sharethis.com",
  "yandex.ru/clck", "mc.yandex.ru", "ad.doubleclick.net", "stats.g.doubleclick.net",
  "googleads.g.doubleclick.net", "analytics.tiktok.com", "ads.tiktok.com",
  "ads-twitter.com", "ads.linkedin.com", "px.ads.linkedin.com", "bat.bing.com",
  "clarity.ms", "snap.licdn.com", "cdn.taboola.com", "ib.adnxs.com",
  "app-measurement.com", "improvedigital.com", "yieldlab.net", "lijit.com", "sovrn.com",
  "onetag-sys.com", "spotx.tv", "smartclip.net", "stickyadstv.com", "loopme.com", "innovid.com",
  "rfihub.com", "adroll.com", "tapad.com", "turn.com", "simpli.fi", "media.net", "yieldmanager.com",
  "adtechus.com", "revcontent.com", "mgid.com", "adblade.com", "exelator.com", "adsymptotic.com",
  "everesttech.net", "comscore.com", "cxense.com", "omtrdc.net", "2o7.net", "gemius.pl", "atdmt.com",
  "ads.yahoo.com", "analytics.yahoo.com", "an.yandex.ru", "adfox.ru", "adcolony.com", "applovin.com",
  "vungle.com", "inmobi.com", "mopub.com", "chartboost.com", "flurry.com", "smaato.net", "fyber.com",
  "adcash.com", "propellerads.com", "popads.net", "popcash.net", "exoclick.com", "juicyads.com",
  "plugrush.com", "adsterra.com", "hilltopads.net", "clickadu.com", "trafficstars.com"
];

function isBlocked(url) {
  try {
    const u = new URL(url);
    const host = u.hostname;
    return BLOCKLIST.some((d) => {
      if (d.includes("/")) return (host + u.pathname).includes(d);
      return host === d || host.endsWith("." + d);
    });
  } catch {
    return false;
  }
}

function sendCount() {
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send("blocked-count", blockedCount);
}

function isGoogleAuthUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && url.hostname === "accounts.google.com";
  } catch {
    return false;
  }
}

function attachSession(ses) {
  ses.setUserAgent(CHROME_UA);
  // Google OAuth, Electron/Chromium webview kimligini bazi hesaplarda reddediyor.
  // Yalnizca Google giris isteginde Firefox uyumluluk kimligi kullan.
  ses.webRequest.onBeforeSendHeaders({
    urls: ["https://accounts.google.com/*", "https://accounts.youtube.com/*"]
  }, (details, cb) => {
    const requestHeaders = { ...details.requestHeaders };
    for (const name of Object.keys(requestHeaders)) {
      if (name.toLowerCase().startsWith("sec-ch-ua")) delete requestHeaders[name];
    }
    requestHeaders["User-Agent"] = GOOGLE_AUTH_UA;
    cb({ requestHeaders });
  });
  ses.webRequest.onBeforeRequest({ urls: ["*://*/*"] }, (details, cb) => {
    if (shieldsEnabled && isBlocked(details.url)) {
      blockedCount++;
      sendCount();
      cb({ cancel: true });
    } else {
      cb({});
    }
  });
  ses.on("will-download", (event, item) => {
    const info = { filename: item.getFilename(), url: item.getURL(), total: item.getTotalBytes() };
    if (mainWindow && !mainWindow.isDestroyed())
      mainWindow.webContents.send("download-started", info);
    item.on("done", (e, state) => {
      if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send("download-done", { ...info, state, path: item.getSavePath() });
    });
  });
}

function attachContextMenu(contents) {
  if (contents.__ardaContextMenu) return;
  contents.__ardaContextMenu = true;
  contents.on("context-menu", (_event, params) => {
    const edit = params.editFlags || {};
    const template = [];
    if (params.isEditable) {
      template.push(
        { label: "Geri al", enabled: !!edit.canUndo, click: () => contents.undo() },
        { label: "Yinele", enabled: !!edit.canRedo, click: () => contents.redo() },
        { type: "separator" },
        { label: "Kes", enabled: !!edit.canCut, click: () => contents.cut() },
        { label: "Kopyala", enabled: !!edit.canCopy, click: () => contents.copy() },
        { label: "Yapıştır", enabled: !!edit.canPaste, click: () => contents.paste() },
        { label: "Tümünü seç", click: () => contents.selectAll() }
      );
    } else if (params.selectionText) {
      template.push({ label: "Kopyala", click: () => clipboard.writeText(params.selectionText) });
    }
    if (params.linkURL) {
      if (template.length) template.push({ type: "separator" });
      template.push(
        { label: "Bağlantıyı yeni sekmede aç", click: () => mainWindow?.webContents.send("open-new-tab", params.linkURL) },
        { label: "Bağlantıyı kopyala", click: () => clipboard.writeText(params.linkURL) },
        { label: "Bağlantıyı indir", click: () => contents.downloadURL(params.linkURL) }
      );
    }
    if (params.srcURL && params.mediaType === "image") {
      if (template.length) template.push({ type: "separator" });
      template.push(
        { label: "Resmi orijinal boyutta indir", click: () => contents.downloadURL(params.srcURL) },
        { label: "Resim adresini kopyala", click: () => clipboard.writeText(params.srcURL) }
      );
    } else if (params.srcURL && ["video", "audio"].includes(params.mediaType)) {
      if (template.length) template.push({ type: "separator" });
      template.push({ label: "Medyayı indir", click: () => contents.downloadURL(params.srcURL) });
    }
    if (!params.isEditable && !params.linkURL && !params.srcURL) {
      if (template.length) template.push({ type: "separator" });
      template.push(
        { label: "Geri", enabled: contents.canGoBack(), click: () => contents.goBack() },
        { label: "İleri", enabled: contents.canGoForward(), click: () => contents.goForward() },
        { label: "Yenile", click: () => contents.reload() }
      );
    }
    if (!template.length) return;
    Menu.buildFromTemplate(template).popup({ window: mainWindow });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 720,
    minHeight: 500,
    backgroundColor: "#ffffff",
    title: "Arda Browser",
    icon: path.join(__dirname, "icon.ico"),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  attachContextMenu(mainWindow.webContents);
}

app.whenReady().then(() => {
  attachSession(session.defaultSession);
  attachSession(session.fromPartition("incognito"));

  // Webview icinde target=_blank / window.open -> yeni sekme olarak ac
  app.on("web-contents-created", (e, contents) => {
    if (contents.getType() === "webview") {
      // Ilk ag isteginden itibaren guncel Chrome kimligi kullanilsin.
      contents.setUserAgent(CHROME_UA);
      attachContextMenu(contents);
      contents.setWindowOpenHandler(({ url }) => {
        if (mainWindow && !mainWindow.isDestroyed())
          mainWindow.webContents.send("open-new-tab", url);
        return { action: "deny" };
      });
    }
  });

  ipcMain.handle("toggle-shields", (e, on) => {
    shieldsEnabled = !!on;
    return shieldsEnabled;
  });
  ipcMain.handle("get-shields", () => shieldsEnabled);
  ipcMain.handle("get-search-suggestions", async (_event, rawQuery) => {
    const query = String(rawQuery || "").trim().slice(0, 200);
    if (!query) return [];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await net.fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`, {
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });
      if (!response.ok) return [];
      const data = await response.json();
      if (Array.isArray(data?.[1])) return data[1].filter((x) => typeof x === "string").slice(0, 7);
      if (Array.isArray(data)) return data.map((x) => x?.phrase).filter(Boolean).slice(0, 7);
      return [];
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  });

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
