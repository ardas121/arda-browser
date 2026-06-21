// ---------- Durum ----------
const NEWTAB = "newtab.html";
const GOOGLE_AUTH_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0";
let tabs = [];
let activeId = null;
let tabSeq = 0;
let draggedTabId = null;

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};
const browserLanguage = (navigator.language || "en").split("-")[0].toLowerCase();
const defaultLanguage = window.ARDA_I18N.supported.includes(browserLanguage) ? browserLanguage : "en";
let settings = {
  engine: "ddg",
  theme: "dark",
  language: defaultLanguage,
  ...store.get("settings", {})
};
if (!window.ARDA_I18N.supported.includes(settings.language)) settings.language = defaultLanguage;
let bookmarks = store.get("bookmarks", []);
let history = store.get("history", []);
let downloads = [];
let openPanelKind = null;

const $ = (s) => document.querySelector(s);
const views = $("#views");
const tabsEl = $("#tabs");
const addr = $("#address");
const suggestionsEl = $("#addressSuggestions");
const languageSelect = $("#languageSelect");
let suggestions = [];
let suggestionIndex = -1;
let suggestionTimer = null;
let suggestionRequest = 0;

function t(key) {
  return window.ARDA_I18N.get(settings.language, key);
}

function applyLanguage() {
  document.documentElement.lang = settings.language;
  document.documentElement.dir = settings.language === "ar" ? "rtl" : "ltr";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  languageSelect.value = settings.language;
}

languageSelect.addEventListener("change", () => {
  settings.language = languageSelect.value;
  store.set("settings", settings);
  applyLanguage();
  tabs.forEach((tab) => {
    if (!tab.isNewTab) return;
    tab.title = t("newTab");
    tab.wv.loadURL(newtabUrl());
  });
  renderTabs();
  if (!side.classList.contains("hidden")) closePanel();
});

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

function faviconFor(rawUrl, search = false) {
  if (search) {
    const domain = settings.engine === "google" ? "google.com" : settings.engine === "bing" ? "bing.com" : "duckduckgo.com";
    return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
  }
  try {
    const domain = new URL(rawUrl).hostname;
    return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}`;
  } catch { return ""; }
}

function hideSuggestions() {
  suggestionsEl.classList.add("hidden");
  suggestionsEl.innerHTML = "";
  suggestions = [];
  suggestionIndex = -1;
}

function chooseSuggestion(item) {
  if (!item) return;
  addr.value = item.input;
  const url = item.url || normalize(item.input);
  hideSuggestions();
  if (url) go(url);
  addr.blur();
}

function renderSuggestions(items) {
  suggestions = items;
  suggestionIndex = -1;
  suggestionsEl.innerHTML = "";
  if (!items.length || document.activeElement !== addr) { hideSuggestions(); return; }
  items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "suggestion";
    row.setAttribute("role", "option");
    const icon = document.createElement("img");
    icon.alt = "";
    icon.src = item.icon || faviconFor(item.url, item.kind === "search");
    const meta = document.createElement("div");
    meta.className = "suggest-main";
    const title = document.createElement("div");
    title.className = "suggest-title";
    title.textContent = item.title;
    const detail = document.createElement("div");
    detail.className = "suggest-url";
    detail.textContent = item.kind === "search" ? `${settings.engine.toUpperCase()} ile ara` : item.url;
    meta.append(title, detail);
    row.append(icon, meta);
    row.addEventListener("mousedown", (event) => { event.preventDefault(); chooseSuggestion(item); });
    suggestionsEl.appendChild(row);
  });
  suggestionsEl.classList.remove("hidden");
}

async function updateSuggestions() {
  const query = addr.value.trim();
  const request = ++suggestionRequest;
  if (!query) { hideSuggestions(); return; }
  const q = query.toLocaleLowerCase();
  const seen = new Set();
  const items = [];
  const addPage = (entry) => {
    const url = entry.url || entry.u || "";
    const title = entry.title || entry.t || url;
    if (!url || seen.has(url) || !(url.toLocaleLowerCase().includes(q) || title.toLocaleLowerCase().includes(q))) return;
    seen.add(url);
    items.push({ kind: "page", title, url, input: url, icon: faviconFor(url) });
  };
  bookmarks.forEach(addPage);
  history.forEach(addPage);
  const remote = await window.arda.getSearchSuggestions(query).catch(() => []);
  if (request !== suggestionRequest || document.activeElement !== addr) return;
  const phrases = [query, ...(Array.isArray(remote) ? remote : [])];
  for (const phrase of phrases) {
    const text = String(phrase || "").trim();
    const key = "search:" + text.toLocaleLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    items.push({ kind: "search", title: text, input: text, url: searchUrl(text), icon: faviconFor("", true) });
  }
  renderSuggestions(items.slice(0, 9));
}
function newtabUrl() {
  return "file://" + location.pathname.replace(/index\.html$/, NEWTAB) +
    "?lang=" + encodeURIComponent(settings.language);
}

function isGoogleAuthUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && url.hostname === "accounts.google.com";
  } catch {
    return false;
  }
}

// ---------- Sekme yonetimi ----------
function createTab(url, opts = {}) {
  const id = ++tabSeq;
  const wv = document.createElement("webview");
  wv.setAttribute("allowpopups", "");
  if (url && isGoogleAuthUrl(url)) wv.setAttribute("useragent", GOOGLE_AUTH_UA);
  if (opts.priv) wv.setAttribute("partition", "incognito");
  wv.dataset.id = id;
  wv.src = url || newtabUrl();
  views.appendChild(wv);

  const isAi = !!opts.ai || /^https:\/\/(?:www\.)?duck\.ai(?:\/|$)/i.test(url || "");
  const tab = { id, wv, title: isAi ? "Arda AI" : t("newTab"), url: url || "", isNewTab: !url, priv: !!opts.priv, ai: isAi, loading: false, fav: "", justOpened: true };
  tabs.push(tab);

  wv.addEventListener("page-title-updated", (e) => { tab.title = tab.ai ? "Arda AI" : e.title; renderTabs(); });
  wv.addEventListener("page-favicon-updated", (e) => { tab.fav = (e.favicons && e.favicons[0]) || ""; renderTabs(); });
  wv.addEventListener("did-start-loading", () => { tab.loading = true; renderTabs(); if (id === activeId) updateChrome(); });
  wv.addEventListener("did-stop-loading", () => { tab.loading = false; renderTabs(); if (id === activeId) updateChrome(); });
  wv.addEventListener("did-fail-load", () => { tab.loading = false; renderTabs(); if (id === activeId) updateChrome(); });
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
  if (tab.isNewTab) tab.title = t("newTab");
  renderTabs();
  if (tab.id === activeId) updateChrome();
  if (!tab.priv && url && !url.startsWith("file://") && url !== "about:blank") {
    history.unshift({ url, title: tab.title || url, time: Date.now() });
    history = history.slice(0, 500);
    store.set("history", history);
  }
  saveSession();
}

function activeTab() { return tabs.find((t) => t.id === activeId); }

function switchTab(id) {
  activeId = id;
  tabs.forEach((t) => t.wv.classList.toggle("active", t.id === id));
  renderTabs();
  updateChrome();
  saveSession();
}

function closeTab(id) {
  const idx = tabs.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const closingTab = tabs[idx];
  if (closingTab.closing) return;
  closingTab.closing = true;
  renderTabs();
  const finish = () => {
    const i = tabs.findIndex((t) => t.id === id);
    if (i === -1) return;
    tabs[i].wv.remove();
    tabs.splice(i, 1);
    if (activeId === id) {
      if (tabs.length === 0) { createTab(); return; }
      switchTab(tabs[Math.max(0, i - 1)].id);
    }
    renderTabs();
    saveSession();
  };
  setTimeout(finish, 150);
}

function renderTabs() {
  tabsEl.innerHTML = "";
  tabs.forEach((t) => {
    const el = document.createElement("div");
    el.className = "tab" + (t.id === activeId ? " active" : "") + (t.priv ? " private" : "") + (t.closing ? " closing" : "");
    if (t.justOpened) { el.classList.add("opening"); t.justOpened = false; }
    el.draggable = !t.closing;
    el.addEventListener("dragstart", (event) => {
      if (event.target.closest?.(".close")) { event.preventDefault(); return; }
      draggedTabId = t.id;
      el.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(t.id));
    });
    el.addEventListener("dragover", (event) => { event.preventDefault(); if (draggedTabId !== t.id) el.classList.add("drag-target"); });
    el.addEventListener("dragleave", () => el.classList.remove("drag-target"));
    el.addEventListener("drop", (event) => {
      event.preventDefault();
      const from = tabs.findIndex((x) => x.id === draggedTabId);
      const to = tabs.findIndex((x) => x.id === t.id);
      if (from >= 0 && to >= 0 && from !== to) {
        const [moved] = tabs.splice(from, 1);
        tabs.splice(to, 0, moved);
        renderTabs();
        saveSession();
      }
      draggedTabId = null;
    });
    el.addEventListener("dragend", () => { draggedTabId = null; renderTabs(); });
    const fav = document.createElement("div");
    fav.className = "favicon";
    if (t.priv) fav.textContent = "🕶";
    else if (t.fav) fav.style.backgroundImage = `url("${t.fav}")`;
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = t.isNewTab ? window.ARDA_I18N.get(settings.language, "newTab") :
      (t.loading ? window.ARDA_I18N.get(settings.language, "loading") : (t.title || window.ARDA_I18N.get(settings.language, "newTab")));
    const close = document.createElement("button");
    close.className = "close";
    close.textContent = "✕";
    close.draggable = false;
    close.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      closeTab(t.id);
    });
    close.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); });
    el.append(fav, title, close);
    el.onclick = () => { if (!t.closing) switchTab(t.id); };
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
  if (e.key === "ArrowDown" && suggestions.length) {
    e.preventDefault();
    suggestionIndex = (suggestionIndex + 1) % suggestions.length;
    [...suggestionsEl.children].forEach((el, i) => el.classList.toggle("selected", i === suggestionIndex));
    return;
  }
  if (e.key === "ArrowUp" && suggestions.length) {
    e.preventDefault();
    suggestionIndex = (suggestionIndex - 1 + suggestions.length) % suggestions.length;
    [...suggestionsEl.children].forEach((el, i) => el.classList.toggle("selected", i === suggestionIndex));
    return;
  }
  if (e.key === "Escape") { hideSuggestions(); return; }
  if (e.key === "Enter") {
    if (suggestionIndex >= 0) { e.preventDefault(); chooseSuggestion(suggestions[suggestionIndex]); return; }
    const u = normalize(addr.value);
    if (u) go(u);
    hideSuggestions();
    addr.blur();
  }
});
addr.addEventListener("input", () => {
  clearTimeout(suggestionTimer);
  suggestionTimer = setTimeout(updateSuggestions, 160);
});
addr.addEventListener("focus", () => { addr.select(); if (addr.value.trim()) updateSuggestions(); });
addr.addEventListener("blur", () => setTimeout(hideSuggestions, 120));
$("#back").onclick = () => { const t = activeTab(); try { t.wv.goBack(); } catch {} };
$("#forward").onclick = () => { const t = activeTab(); try { t.wv.goForward(); } catch {} };
$("#reload").onclick = () => { const t = activeTab(); if (t.loading) t.wv.stop(); else t.wv.reload(); };
$("#home").onclick = () => go(newtabUrl());
$("#newtab").onclick = () => {
  const button = $("#newtab");
  button.classList.remove("pulse");
  void button.offsetWidth;
  button.classList.add("pulse");
  createTab();
};
$("#newtab").addEventListener("animationend", () => $("#newtab").classList.remove("pulse"));
$("#ardaai").onclick = () => createTab("https://duck.ai", { ai: true });

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
  const act = e.target.closest(".menuitem")?.dataset.act;
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
function closePanel() { overlay.classList.add("hidden"); side.classList.add("hidden"); openPanelKind = null; }
function openPanel(kind) {
  openPanelKind = kind;
  overlay.classList.remove("hidden");
  side.classList.remove("hidden");
  const body = $("#panelbody");
  body.innerHTML = "";
  if (kind === "history") {
    $("#paneltitle").textContent = t("history");
    if (!history.length) body.innerHTML = `<div class="empty">${t("historyEmpty")}</div>`;
    history.slice(0, 200).forEach((h) => body.appendChild(rowItem("🕘", h.title, h.url, () => go(h.url), () => {
      history = history.filter((x) => x !== h); store.set("history", history); openPanel("history");
    })));
    addClear(body, t("clearHistory"), () => { history = []; store.set("history", history); openPanel("history"); });
  } else if (kind === "bookmarks") {
    $("#paneltitle").textContent = t("bookmarks");
    if (!bookmarks.length) body.innerHTML = `<div class="empty">${t("bookmarksEmpty")}</div>`;
    bookmarks.forEach((b) => body.appendChild(rowItem("★", b.title, b.url, () => go(b.url), () => {
      bookmarks = bookmarks.filter((x) => x !== b); store.set("bookmarks", bookmarks); openPanel("bookmarks"); updateChrome();
    })));
  } else if (kind === "downloads") {
    $("#paneltitle").textContent = t("downloads");
    if (!downloads.length) body.innerHTML = `<div class="empty">${t("downloadsEmpty")}</div>`;
    downloads.forEach((d) => body.appendChild(rowItem(d.state === "completed" ? "✅" : "⬇", d.filename, d.state === "completed" ? d.path : d.url, () => {})));
    body.innerHTML = "";
    if (!downloads.length) body.innerHTML = `<div class="empty">${t("downloadsEmpty")}</div>`;
    downloads.forEach((d) => body.appendChild(downloadItem(d)));
  } else if (kind === "settings") {
    $("#paneltitle").textContent = t("settings");
    body.appendChild(settingsUI());
  }
}

const DOWNLOAD_TEXT = {
  tr: { downloading: "İndiriliyor", paused: "Duraklatıldı", completed: "Tamamlandı", cancelled: "İptal edildi", interrupted: "Kesintiye uğradı", pause: "Duraklat", resume: "Devam et", cancel: "İptal", open: "Aç", folder: "Klasörde göster", remaining: "kaldı" },
  en: { downloading: "Downloading", paused: "Paused", completed: "Completed", cancelled: "Cancelled", interrupted: "Interrupted", pause: "Pause", resume: "Resume", cancel: "Cancel", open: "Open", folder: "Show in folder", remaining: "left" },
  de: { downloading: "Wird heruntergeladen", paused: "Pausiert", completed: "Abgeschlossen", cancelled: "Abgebrochen", interrupted: "Unterbrochen", pause: "Pause", resume: "Fortsetzen", cancel: "Abbrechen", open: "Öffnen", folder: "Im Ordner zeigen", remaining: "verbleibend" },
  fr: { downloading: "Téléchargement", paused: "En pause", completed: "Terminé", cancelled: "Annulé", interrupted: "Interrompu", pause: "Pause", resume: "Reprendre", cancel: "Annuler", open: "Ouvrir", folder: "Afficher dans le dossier", remaining: "restantes" },
  es: { downloading: "Descargando", paused: "Pausado", completed: "Completado", cancelled: "Cancelado", interrupted: "Interrumpido", pause: "Pausar", resume: "Continuar", cancel: "Cancelar", open: "Abrir", folder: "Mostrar en carpeta", remaining: "restantes" }
};
function downloadText() { return DOWNLOAD_TEXT[settings.language] || DOWNLOAD_TEXT.en; }
function formatBytes(value) {
  const n = Number(value) || 0;
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = n / 1024; let unit = units[0];
  for (let i = 1; size >= 1024 && i < units.length; i++) { size /= 1024; unit = units[i]; }
  return `${size >= 100 ? size.toFixed(0) : size.toFixed(1)} ${unit}`;
}
function formatEta(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  if (seconds < 60) return `${Math.ceil(seconds)} sn`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} dk`;
  return `${Math.floor(seconds / 3600)} sa ${Math.ceil((seconds % 3600) / 60)} dk`;
}
function downloadItem(d) {
  const tx = downloadText();
  const total = Number(d.total) || 0;
  const received = Number(d.received) || 0;
  const percent = total > 0 ? Math.min(100, Math.max(0, received / total * 100)) : 0;
  const active = d.state === "progress" || d.state === "interrupted";
  const status = d.state === "completed" ? tx.completed : d.state === "cancelled" ? tx.cancelled : d.state === "interrupted" ? tx.interrupted : d.paused ? tx.paused : tx.downloading;
  const eta = d.speed > 0 && total > received ? formatEta((total - received) / d.speed) : "";
  const card = document.createElement("div");
  card.className = `download-card ${d.state}`;
  card.innerHTML = `
    <div class="download-top"><div class="download-icon">${d.state === "completed" ? "✓" : "↓"}</div><div class="download-info"><div class="download-name"></div><div class="download-status"></div></div><strong class="download-percent">${total ? `${Math.round(percent)}%` : "…"}</strong></div>
    <div class="download-track"><div class="download-fill${total ? "" : " indeterminate"}" style="width:${total ? percent : 100}%"></div></div>
    <div class="download-details"></div><div class="download-actions"></div>`;
  card.querySelector(".download-name").textContent = d.filename;
  card.querySelector(".download-status").textContent = status;
  const details = [`${formatBytes(received)}${total ? ` / ${formatBytes(total)}` : ""}`];
  if (active && !d.paused && d.speed > 0) details.push(`${formatBytes(d.speed)}/sn`);
  if (eta) details.push(`${eta} ${tx.remaining}`);
  card.querySelector(".download-details").textContent = details.join("  •  ");
  const actions = card.querySelector(".download-actions");
  const addAction = (label, action, danger = false) => {
    const button = document.createElement("button");
    button.className = `download-action${danger ? " danger" : ""}`;
    button.textContent = label;
    button.onclick = () => window.arda.downloadAction(d.id, action);
    actions.appendChild(button);
  };
  if (active) { addAction(d.paused ? tx.resume : tx.pause, d.paused ? "resume" : "pause"); addAction(tx.cancel, "cancel", true); }
  if (d.state === "completed") { addAction(tx.open, "open"); addAction(tx.folder, "folder"); }
  return card;
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
      <label>${t("searchEngine")}</label>
      <select id="setEngine">
        <option value="ddg">DuckDuckGo</option>
        <option value="google">Google</option>
        <option value="bing">Bing</option>
      </select>
    </div>
    <div class="setting">
      <label>${t("shieldsSetting")}</label>
      <select id="setShields"><option value="on">${t("enabled")}</option><option value="off">${t("disabled")}</option></select>
    </div>
    <div class="setting">
      <label>${t("blockedTotal")}</label>
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
function updateDownload(d) {
  const i = downloads.findIndex((x) => x.id === d.id);
  if (i >= 0) downloads[i] = { ...downloads[i], ...d }; else downloads.unshift(d);
  if (openPanelKind === "downloads") openPanel("downloads");
}
window.arda.onDownloadStarted(updateDownload);
window.arda.onDownloadProgress(updateDownload);
window.arda.onDownloadDone((d) => {
  updateDownload(d);
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

// ---------- Oturum (sekmeleri hatirla) ----------
function saveSession() {
  const visible = tabs.filter((t) => !t.priv);
  const open = visible.map((t) =>
    (t.isNewTab || !t.url || t.url.startsWith("file://") || t.url === "about:blank") ? "home" : t.url);
  const active = Math.max(0, visible.findIndex((t) => t.id === activeId));
  store.set("session", { tabs: open, active });
}
function restoreSession() {
  const s = store.get("session", null);
  if (!s || !Array.isArray(s.tabs) || s.tabs.length === 0) { createTab(); return; }
  s.tabs.forEach((u) => createTab(u === "home" ? null : u));
  const idx = Math.min(Math.max(0, s.active | 0), tabs.length - 1);
  if (tabs[idx]) switchTab(tabs[idx].id);
}

// ---------- Baslat ----------
applyLanguage();
restoreSession();
