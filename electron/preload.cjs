const {contextBridge, ipcRenderer} = require("electron");

contextBridge.exposeInMainWorld("thReconciliation", {
    runQuery: () =>
        ipcRenderer.invoke(
            "th-reconciliation:run-query"
        ),
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
