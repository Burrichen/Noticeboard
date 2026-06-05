const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("noticeboardAPI", {
  getData: () => ipcRenderer.invoke("noticeboard:get-data"),
  getSettings: () => ipcRenderer.invoke("noticeboard:get-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("noticeboard:save-settings", settings)
});