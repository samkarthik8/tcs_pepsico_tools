const {contextBridge, ipcRenderer} = require("electron");

contextBridge.exposeInMainWorld("thReconciliation", {
    runQuery: (password) => ipcRenderer.invoke("th-reconciliation:run-query", password),
});
