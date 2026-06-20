const { app, BrowserWindow, session, ipcMain } = require("electron");
const path = require("path");

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

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

function attachSession(ses) {
  ses.setUserAgent(CHROME_UA);
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
}

app.whenReady().then(() => {
  attachSession(session.defaultSession);
  attachSession(session.fromPartition("incognito"));

  // Webview icinde target=_blank / window.open -> yeni sekme olarak ac
  app.on("web-contents-created", (e, contents) => {
    if (contents.getType() === "webview") {
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

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
