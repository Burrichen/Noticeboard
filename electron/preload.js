const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("noticeboardAPI", {
  getData: () => ipcRenderer.invoke("noticeboard:get-data"),
  reloadData: () => ipcRenderer.invoke("noticeboard:reload-data"),
  getSettings: () => ipcRenderer.invoke("noticeboard:get-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("noticeboard:save-settings", settings),
  buildLegitimateContract: (payload) => ipcRenderer.invoke("noticeboard:build-legitimate", payload),
  buildIllegitimateContract: (payload) => ipcRenderer.invoke("noticeboard:build-illegitimate", payload)
});
