// ---------- Durum ----------
const NEWTAB = "newtab.html";
let tabs = [];
let activeId = null;
let tabSeq = 0;

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};
let settings = store.get("settings", { engine: "ddg", theme: "dark" });
let bookmarks = store.get("bookmarks", []);
let history = store.get("history", []);
let downloads = [];

const $ = (s) => document.querySelector(s);
const views = $("#views");
const tabsEl = $("#tabs");
const addr = $("#address");

// ---------- Adres / arama ----------
function searchUrl(q) {
  const e = settings.engine;
  if (e === "google") return "https://www.google.com/search?q=" + encodeURIComponent(q);
  if (e === "bing") return "https://www.bing.com/search?q=" + encodeURIComponent(q);
  return "https://duckduckgo.com/?q=" + encodeURIComponent(q);
}
function normalize(text) {
  text = text.trim();
  if (!text) return null;
  if (/^(https?|file|about):/i.test(text)) return text;
  if (/^localhost(:\d+)?(\/.*)?$/i.test(text)) return "http://" + text;
  if (/^[^\s.]+\.[^\s]{2,}(\/.*)?$/.test(text)) return "https://" + text;
  return searchUrl(text);
}
function newtabUrl() {
  return "file://" + location.pathname.replace(/index\.html$/, NEWTAB);
}

// ---------- Sekme yonetimi ----------
function createTab(url, opts = {}) {
  const id = ++tabSeq;
  const wv = document.createElement("webview");
  wv.setAttribute("allowpopups", "");
  if (opts.priv) wv.setAttribute("partition", "incognito");
  wv.dataset.id = id;
  wv.src = url || newtabUrl();
  views.appendChild(wv);

  const tab = { id, wv, title: "New Tab", url: url || "", isNewTab: !url, priv: !!opts.priv, loading: false, fav: "" };
  tabs.push(tab);

  wv.addEventListener("page-title-updated", (e) => { tab.title = e.title; renderTabs(); });
  wv.addEventListener("page-favicon-updated", (e) => { tab.fav = (e.favicons && e.favicons[0]) || ""; renderTabs(); });
  wv.addEventListener("did-start-loading", () => { tab.loading = true; if (id === activeId) updateChrome(); });
  wv.addEventListener("did-stop-loading", () => { tab.loading = false; if (id === activeId) updateChrome(); });
  wv.addEventListener("did-navigate", (e) => { tab.url = e.url; onNavigate(tab, e.url); });
  wv.addEventListener("did-navigate-in-page", (e) => { if (e.isMainFrame) { tab.url = e.url; onNavigate(tab, e.url); } });
  wv.addEventListener("found-in-page", (e) => {
    const r = e.result;
    $("#findcount").textContent = (r.activeMatchOrdinal || 0) + "/" + (r.matches || 0);
  });

  switchTab(id);
  renderTabs();
  return tab;
}

function onNavigate(tab, url) {
  tab.isNewTab = !url || url.startsWith("file://") || url === "about:blank";
  if (tab.isNewTab) tab.title = "New Tab";
  renderTabs();
  if (tab.id === activeId) updateChrome();
  if (!tab.priv && url && !url.startsWith("file://") && url !== "about:blank") {
    history.unshift({ url, title: tab.title || url, time: Date.now() });
    history = history.slice(0, 500);
    store.set("history", history);
  }
}

function activeTab() { return tabs.find((t) => t.id === activeId); }

function switchTab(id) {
  activeId = id;
  tabs.forEach((t) => t.wv.classList.toggle("active", t.id === id));
  renderTabs();
  updateChrome();
}

function closeTab(id) {
  const i = tabs.findIndex((t) => t.id === id);
  if (i === -1) return;
  tabs[i].wv.remove();
  tabs.splice(i, 1);
  if (activeId === id) {
    if (tabs.length === 0) { createTab(); return; }
    switchTab(tabs[Math.max(0, i - 1)].id);
  }
  renderTabs();
}

function renderTabs() {
  tabsEl.innerHTML = "";
  tabs.forEach((t) => {
    const el = document.createElement("div");
    el.className = "tab" + (t.id === activeId ? " active" : "") + (t.priv ? " private" : "");
    const fav = document.createElement("div");
    fav.className = "favicon";
    if (t.priv) fav.textContent = "🕶";
    else if (t.fav) fav.style.backgroundImage = `url("${t.fav}")`;
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = t.isNewTab ? "New Tab" : (t.loading ? "Yükleniyor…" : (t.title || "New Tab"));
    const close = document.createElement("button");
    close.className = "close";
    close.textContent = "✕";
    close.onclick = (ev) => { ev.stopPropagation(); closeTab(t.id); };
    el.append(fav, title, close);
    el.onclick = () => switchTab(t.id);
    tabsEl.appendChild(el);
  });
}

// ---------- Arac cubugu durumu ----------
function updateChrome() {
  const t = activeTab();
  if (!t) return;
  const url = t.url && !t.url.startsWith("file://") ? t.url : "";
  if (document.activeElement !== addr) addr.value = url;
  $("#lock").textContent = url.startsWith("https://") ? "🔒" : (url ? "⚠" : "🔎");
  $("#reload").textContent = t.loading ? "✕" : "⟳";
  try {
    $("#back").disabled = !t.wv.canGoBack();
    $("#forward").disabled = !t.wv.canGoForward();
  } catch {}
  const isBm = bookmarks.some((b) => b.url === url);
  $("#star").textContent = isBm ? "★" : "☆";
  renderBookmarksBar();
}

function go(url) {
  const t = activeTab();
  if (t && url) t.wv.loadURL(url);
}

// ---------- Olaylar: arac cubugu ----------
addr.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const u = normalize(addr.value);
    if (u) go(u);
    addr.blur();
  }
});
addr.addEventListener("focus", () => addr.select());
$("#back").onclick = () => { const t = activeTab(); try { t.wv.goBack(); } catch {} };
$("#forward").onclick = () => { const t = activeTab(); try { t.wv.goForward(); } catch {} };
$("#reload").onclick = () => { const t = activeTab(); if (t.loading) t.wv.stop(); else t.wv.reload(); };
$("#home").onclick = () => go(newtabUrl());
$("#newtab").onclick = () => createTab();

// ---------- Yer imleri ----------
$("#star").onclick = () => {
  const t = activeTab();
  const url = t.url;
  if (!url || url.startsWith("file://")) return;
  const i = bookmarks.findIndex((b) => b.url === url);
  if (i >= 0) bookmarks.splice(i, 1);
  else bookmarks.unshift({ url, title: t.title || url });
  store.set("bookmarks", bookmarks);
  updateChrome();
};
function renderBookmarksBar() {
  const bar = $("#bookmarksbar");
  bar.innerHTML = "";
  bookmarks.slice(0, 30).forEach((b) => {
    const el = document.createElement("div");
    el.className = "bm";
    el.textContent = "★ " + (b.title || b.url).slice(0, 28);
    el.title = b.url;
    el.onclick = () => go(b.url);
    bar.appendChild(el);
  });
}

// ---------- Menu ----------
const menu = $("#menupanel");
$("#menu").onclick = (e) => { e.stopPropagation(); menu.classList.toggle("hidden"); };
document.addEventListener("click", () => menu.classList.add("hidden"));
menu.addEventListener("click", (e) => {
  const act = e.target.dataset.act;
  if (!act) return;
  menu.classList.add("hidden");
  if (act === "newtab") createTab();
  else if (act === "private") createTab(null, { priv: true });
  else if (act === "find") openFind();
  else openPanel(act);
});

// ---------- Yan panel ----------
const overlay = $("#overlay");
const side = $("#sidepanel");
$("#panelclose").onclick = closePanel;
overlay.onclick = closePanel;
function closePanel() { overlay.classList.add("hidden"); side.classList.add("hidden"); }
function openPanel(kind) {
  overlay.classList.remove("hidden");
  side.classList.remove("hidden");
  const body = $("#panelbody");
  body.innerHTML = "";
  if (kind === "history") {
    $("#paneltitle").textContent = "Geçmiş";
    if (!history.length) body.innerHTML = '<div class="empty">Geçmiş boş.</div>';
    history.slice(0, 200).forEach((h) => body.appendChild(rowItem("🕘", h.title, h.url, () => go(h.url), () => {
      history = history.filter((x) => x !== h); store.set("history", history); openPanel("history");
    })));
    addClear(body, "Geçmişi temizle", () => { history = []; store.set("history", history); openPanel("history"); });
  } else if (kind === "bookmarks") {
    $("#paneltitle").textContent = "Yer imleri";
    if (!bookmarks.length) body.innerHTML = '<div class="empty">Henüz yer imi yok.</div>';
    bookmarks.forEach((b) => body.appendChild(rowItem("★", b.title, b.url, () => go(b.url), () => {
      bookmarks = bookmarks.filter((x) => x !== b); store.set("bookmarks", bookmarks); openPanel("bookmarks"); updateChrome();
    })));
  } else if (kind === "downloads") {
    $("#paneltitle").textContent = "İndirilenler";
    if (!downloads.length) body.innerHTML = '<div class="empty">İndirme yok.</div>';
    downloads.forEach((d) => body.appendChild(rowItem(d.state === "completed" ? "✅" : "⬇", d.filename, d.state === "completed" ? d.path : d.url, () => {})));
  } else if (kind === "settings") {
    $("#paneltitle").textContent = "Ayarlar";
    body.appendChild(settingsUI());
  }
}
function rowItem(ico, t, u, onClick, onDel) {
  const row = document.createElement("div");
  row.className = "row";
  row.innerHTML = `<div class="ico">${ico}</div><div class="meta"><div class="t"></div><div class="u"></div></div>`;
  row.querySelector(".t").textContent = t || u;
  row.querySelector(".u").textContent = u || "";
  row.querySelector(".meta").onclick = onClick;
  if (onDel) {
    const del = document.createElement("button");
    del.className = "del"; del.textContent = "🗑";
    del.onclick = (e) => { e.stopPropagation(); onDel(); };
    row.appendChild(del);
  }
  return row;
}
function addClear(body, label, fn) {
  const b = document.createElement("button");
  b.className = "btn"; b.textContent = label; b.style.marginTop = "12px"; b.onclick = fn;
  body.appendChild(b);
}
function settingsUI() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="setting">
      <label>Arama motoru</label>
      <select id="setEngine">
        <option value="ddg">DuckDuckGo</option>
        <option value="google">Google</option>
        <option value="bing">Bing</option>
      </select>
    </div>
    <div class="setting">
      <label>Reklam/izleyici engelleme (Shields)</label>
      <select id="setShields"><option value="on">Açık</option><option value="off">Kapalı</option></select>
    </div>
    <div class="setting">
      <label>Engellenen toplam istek</label>
      <div style="font-size:22px;font-weight:700;color:var(--accent2)" id="setCount">0</div>
    </div>`;
  wrap.querySelector("#setEngine").value = settings.engine;
  wrap.querySelector("#setEngine").onchange = (e) => { settings.engine = e.target.value; store.set("settings", settings); };
  wrap.querySelector("#setShields").value = shieldsOn ? "on" : "off";
  wrap.querySelector("#setShields").onchange = (e) => setShields(e.target.value === "on");
  wrap.querySelector("#setCount").textContent = blockedTotal;
  return wrap;
}

// ---------- Shields ----------
let shieldsOn = true;
let blockedTotal = 0;
function setShields(on) {
  shieldsOn = on;
  window.arda.toggleShields(on);
  $("#shields").style.opacity = on ? "1" : ".45";
}
$("#shields").onclick = () => setShields(!shieldsOn);
window.arda.onBlockedCount((n) => {
  blockedTotal = n;
  $("#shieldcount").textContent = n;
  const c = document.getElementById("setCount");
  if (c) c.textContent = n;
});
window.arda.getShields().then((on) => setShields(on));

// ---------- Indirilenler ----------
window.arda.onDownloadStarted((d) => { downloads.unshift({ ...d, state: "progress" }); });
window.arda.onDownloadDone((d) => {
  const i = downloads.findIndex((x) => x.url === d.url && x.state === "progress");
  if (i >= 0) downloads[i] = d; else downloads.unshift(d);
});

// ---------- Yeni sekme istegi (target=_blank) ----------
window.arda.onOpenTab((url) => createTab(url));

// ---------- Bul ----------
const findbar = $("#findbar");
const findinput = $("#findinput");
function openFind() {
  findbar.classList.remove("hidden");
  findinput.focus(); findinput.select();
}
function closeFind() {
  findbar.classList.add("hidden");
  try { activeTab().wv.stopFindInPage("clearSelection"); } catch {}
}
findinput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doFind(!e.shiftKey);
  if (e.key === "Escape") closeFind();
});
function doFind(forward) {
  const txt = findinput.value;
  if (!txt) return;
  try { activeTab().wv.findInPage(txt, { forward, findNext: false }); } catch {}
}
$("#findnext").onclick = () => doFind(true);
$("#findprev").onclick = () => doFind(false);
$("#findclose").onclick = closeFind;

// ---------- Kisayollar ----------
document.addEventListener("keydown", (e) => {
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key === "t") { e.preventDefault(); createTab(); }
  else if (ctrl && e.key === "w") { e.preventDefault(); closeTab(activeId); }
  else if (ctrl && e.shiftKey && (e.key === "n" || e.key === "N")) { e.preventDefault(); createTab(null, { priv: true }); }
  else if (ctrl && e.key === "l") { e.preventDefault(); addr.focus(); addr.select(); }
  else if (ctrl && e.key === "r") { e.preventDefault(); activeTab().wv.reload(); }
  else if (ctrl && e.key === "f") { e.preventDefault(); openFind(); }
  else if (e.key === "F5") { e.preventDefault(); activeTab().wv.reload(); }
});

// ---------- Baslat ----------
createTab();
