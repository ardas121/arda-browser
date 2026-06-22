const { app, BrowserWindow, session, ipcMain, Menu, clipboard, net, shell } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const { FiltersEngine, Request } = require("@ghostery/adblocker");

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
let fullAdblockEngine = null;
let downloadSequence = 0;
const activeDownloads = new Map();
const finishedDownloads = new Map();

function sendDownload(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

const RESOURCE_TYPES = {
  mainFrame: "document", subFrame: "subdocument", stylesheet: "stylesheet",
  script: "script", image: "image", font: "font", object: "object",
  xhr: "xhr", ping: "ping", media: "media", webSocket: "websocket"
};

async function initFullAdblock() {
  const fetcher = (url, init) => net.fetch(url, init);
  const cache = {
    path: path.join(app.getPath("userData"), "arda-adblock-engine.bin"),
    read: fs.readFile,
    write: fs.writeFile
  };
  try {
    fullAdblockEngine = await FiltersEngine.fromPrebuiltAdsAndTracking(fetcher, cache);
  } catch {
    try { fullAdblockEngine = await FiltersEngine.fromPrebuiltAdsAndTracking(fetcher); } catch {}
  }
}

function matchesFullAdblock(details) {
  if (!fullAdblockEngine || details.resourceType === "mainFrame") return false;
  try {
    const request = Request.fromRawDetails({
      type: RESOURCE_TYPES[details.resourceType] || "other",
      url: details.url,
      sourceUrl: details.referrer || details.initiator || ""
    });
    const result = fullAdblockEngine.match(request);
    return !!result.match && !result.exception;
  } catch { return false; }
}

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
  "plugrush.com", "adsterra.com", "hilltopads.net", "clickadu.com", "trafficstars.com",
  "monetag.com", "onclicka.com", "onclickalgo.com", "admaven.com", "ad-maven.com",
  "richads.com", "pushground.com", "clickaine.com", "zeropark.com", "popunder.net",
  "trafficjunky.com", "ero-advertising.com", "adnium.com", "adxxx.com", "twinrdack.com"
];

const AD_URL_PATTERN = /(?:^|[./?&=_-])(ads?|adserver|advert(?:ising|isement)?|banner|popunder|popup|sponsor(?:ed)?|promo(?:tion)?|prebid|bidder|tracking|pixel)(?:[./?&=_-]|$)/i;
const COSMETIC_AD_CSS = `
  .adsbygoogle, [id^="google_ads"], [id^="ad-slot"], [id^="ad_slot"],
  [class~="advertisement"], [class~="ad-banner"], [class~="ad-container"],
  [class~="ad-wrapper"], [class~="sponsored"], [data-ad-slot], [data-ad-client],
  iframe[src*="doubleclick"], iframe[src*="googlesyndication"], iframe[src*="adserver"] {
    display: none !important; visibility: hidden !important; width: 0 !important; height: 0 !important;
  }
`;

function isBlocked(url, details = {}) {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const listed = BLOCKLIST.some((d) => {
      if (d.includes("/")) return (host + u.pathname).includes(d);
      return host === d || host.endsWith("." + d);
    });
    if (listed) return true;
    if (details.resourceType === "mainFrame") return false;
    const source = details.referrer || details.initiator || "";
    let thirdParty = true;
    try {
      const sourceHost = new URL(source).hostname;
      thirdParty = sourceHost !== host && !sourceHost.endsWith("." + host) && !host.endsWith("." + sourceHost);
    } catch {}
    return thirdParty && AD_URL_PATTERN.test(host + u.pathname + u.search);
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
    if (shieldsEnabled && (isBlocked(details.url, details) || matchesFullAdblock(details))) {
      blockedCount++;
      sendCount();
      cb({ cancel: true });
    } else {
      cb({});
    }
  });
  ses.on("will-download", (event, item) => {
    const id = `${Date.now()}-${++downloadSequence}`;
    const startedAt = Date.now();
    let lastSentAt = startedAt;
    let lastBytes = 0;
    const baseInfo = () => ({
      id, filename: item.getFilename(), url: item.getURL(),
      total: item.getTotalBytes(), received: item.getReceivedBytes(),
      path: item.getSavePath(), paused: item.isPaused()
    });
    activeDownloads.set(id, item);
    sendDownload("download-started", { ...baseInfo(), state: "progress", startedAt });
    item.on("updated", (_e, state) => {
      const now = Date.now();
      if (now - lastSentAt < 200 && state === "progressing") return;
      const received = item.getReceivedBytes();
      const speed = Math.max(0, (received - lastBytes) / Math.max((now - lastSentAt) / 1000, 0.001));
      lastSentAt = now;
      lastBytes = received;
      sendDownload("download-progress", {
        ...baseInfo(), state: state === "interrupted" ? "interrupted" : "progress", speed
      });
    });
    item.on("done", (e, state) => {
      const info = { ...baseInfo(), state, speed: 0 };
      activeDownloads.delete(id);
      finishedDownloads.set(id, info);
      sendDownload("download-done", info);
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

function attachKeyboardShortcuts(contents) {
  if (contents.__ardaKeyboardShortcuts) return;
  contents.__ardaKeyboardShortcuts = true;
  contents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    const key = String(input.key || "").toLowerCase();
    const ctrl = input.control || input.meta;
    let command = null;
    if (ctrl && input.shift && key === "n") command = "private-tab";
    else if (ctrl && key === "t") command = "new-tab";
    else if (ctrl && key === "w") command = "close-tab";
    else if (ctrl && key === "l") command = "focus-address";
    else if (ctrl && key === "r") command = "reload";
    else if (ctrl && key === "f") command = "find";
    else if (key === "f5") command = "reload";
    if (!command) return;
    event.preventDefault();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("browser-shortcut", command);
    }
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
  attachKeyboardShortcuts(mainWindow.webContents);
}

app.whenReady().then(() => {
  attachSession(session.defaultSession);
  attachSession(session.fromPartition("incognito"));
  initFullAdblock();

  // Webview icinde target=_blank / window.open -> yeni sekme olarak ac
  app.on("web-contents-created", (e, contents) => {
    if (contents.getType() === "webview") {
      // Ilk ag isteginden itibaren guncel Chrome kimligi kullanilsin.
      contents.setUserAgent(CHROME_UA);
      attachContextMenu(contents);
      attachKeyboardShortcuts(contents);
      contents.on("did-finish-load", () => {
        if (shieldsEnabled) contents.insertCSS(COSMETIC_AD_CSS).catch(() => {});
      });
      contents.setWindowOpenHandler(({ url }) => {
        if (shieldsEnabled && isBlocked(url, { resourceType: "subFrame" })) {
          blockedCount++;
          sendCount();
          return { action: "deny" };
        }
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
  ipcMain.handle("download-action", async (_event, id, action) => {
    const item = activeDownloads.get(String(id));
    const finished = finishedDownloads.get(String(id));
    if (action === "pause" && item && !item.isPaused()) {
      item.pause();
      sendDownload("download-progress", { id: String(id), paused: true, state: "progress", received: item.getReceivedBytes(), total: item.getTotalBytes(), speed: 0 });
    } else if (action === "resume" && item && item.isPaused()) {
      item.resume();
      sendDownload("download-progress", { id: String(id), paused: false, state: "progress", received: item.getReceivedBytes(), total: item.getTotalBytes(), speed: 0 });
    }
    else if (action === "cancel" && item) item.cancel();
    else if (action === "open" && finished?.path) return shell.openPath(finished.path);
    else if (action === "folder" && (finished?.path || item?.getSavePath())) {
      shell.showItemInFolder(finished?.path || item.getSavePath());
    }
    return true;
  });
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
