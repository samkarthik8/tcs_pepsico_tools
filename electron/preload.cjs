const {contextBridge, ipcRenderer} = require("electron");

contextBridge.exposeInMainWorld("thReconciliation", {
    runQuery: (password) => ipcRenderer.invoke("th-reconciliation:run-query", password),
});

contextBridge.exposeInMainWorld("trinoConnection", {
    runQuery: (password, query) => ipcRenderer.invoke("trino-connection:run-query", password, query),
});
