const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getHostname: () => ipcRenderer.invoke("get-hostname"),
});
