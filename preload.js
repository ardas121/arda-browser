const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("arda", {
  toggleShields: (on) => ipcRenderer.invoke("toggle-shields", on),
  getShields: () => ipcRenderer.invoke("get-shields"),
  getSearchSuggestions: (query) => ipcRenderer.invoke("get-search-suggestions", query),
  onBlockedCount: (cb) => ipcRenderer.on("blocked-count", (e, n) => cb(n)),
  onOpenTab: (cb) => ipcRenderer.on("open-new-tab", (e, url) => cb(url)),
  onDownloadStarted: (cb) => ipcRenderer.on("download-started", (e, d) => cb(d)),
  onDownloadProgress: (cb) => ipcRenderer.on("download-progress", (e, d) => cb(d)),
  onDownloadDone: (cb) => ipcRenderer.on("download-done", (e, d) => cb(d)),
  downloadAction: (id, action) => ipcRenderer.invoke("download-action", id, action)
});
