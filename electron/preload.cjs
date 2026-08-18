const {contextBridge, ipcRenderer} = require("electron");

contextBridge.exposeInMainWorld("thReconciliation", {
    runQuery: (password) => ipcRenderer.invoke("th-reconciliation:run-query", password),
});

contextBridge.exposeInMainWorld("trinoConnection", {
    runQuery: (query) =>
        ipcRenderer.invoke(
            "trino-connection:run-query",
            query
        ),
});

contextBridge.exposeInMainWorld("customerRewardsHistory", {
    fetchHistory: (catalog, schema, storeId, count) =>
        ipcRenderer.invoke(
            "customer-rewards:fetch-history",
            catalog,
            schema,
            storeId,
            count
        ),
});
