const {app, BrowserWindow, ipcMain} = require("electron");
const path = require("path");
const https = require("https");
const TRINO = {
    host: "b2b-trinodb.dps.gw01.aks01.suk.prod.azure.intra.pepsico.com",
    port: 443, // Confirm these names if catalog/schema in the supplied URL were placeholders.
    catalog: "loyalty_amesa",
    schema: "th_prod",
    username: "pepconndb06",
};
const TH_RECONCILIATION_QUERY = `SELECT store_id     AS "Store",
                                        total_points AS "Points Balance"
                                 FROM th_prod.reward_engine_user
                                 WHERE total_points > 0`;

function trinoRequest(pathname, body, password) {
    return new Promise((resolve, reject) => {
        const request = https.request({
            hostname: TRINO.host,
            port: TRINO.port,
            path: pathname,
            method: body ? "POST" : "GET", // Matches SSLVerification=NONE in the supplied JDBC URL.
            rejectUnauthorized: false,
            headers: {
                Authorization: `Basic ${Buffer.from(`${TRINO.username}:${password}`).toString("base64")}`,
                "X-Trino-User": TRINO.username,
                "X-Trino-Catalog": TRINO.catalog,
                "X-Trino-Schema": TRINO.schema, ...(body ? {
                    "Content-Type": "text/plain; charset=utf-8", "Content-Length": Buffer.byteLength(body)
                } : {}),
            },
            timeout: 60000,
        }, (response) => {
            let data = "";
            response.setEncoding("utf8");
            response.on("data", (chunk) => data += chunk);
            response.on("end", () => {
                try {
                    const parsed = JSON.parse(data);
                    if (response.statusCode < 200 || response.statusCode >= 300) {
                        reject(new Error(parsed.message || `Trino request failed (HTTP ${response.statusCode}).`));
                    } else resolve(parsed);
                } catch {
                    reject(new Error(`Trino returned an invalid response (HTTP ${response.statusCode}).`));
                }
            });
        });
        request.on("timeout", () => request.destroy(new Error("The Trino request timed out.")));
        request.on("error", reject);
        if (body) request.write(body);
        request.end();
    });
}

async function runThReconciliationQuery(password) {
    if (typeof password !== "string" || !password.trim()) throw new Error("Enter your Trino password.");
    let page = await trinoRequest("/v1/statement", TH_RECONCILIATION_QUERY, password);
    const rows = [];
    let columns = page.columns || [];
    while (true) {
        if (page.error) {
            throw new Error(page.error.message || "Trino could not run the query.");
        }
        if (page.columns?.length) {
            columns = page.columns;
        }
        if (page.data?.length) {
            rows.push(...page.data);
        }
        if (!page.nextUri) {
            break;
        }
        const nextUrl = new URL(page.nextUri);
        page = await trinoRequest(`${nextUrl.pathname}${nextUrl.search}`, null, password);
    }
    return {
        columns: columns.map(column => column.name), rows, truncated: false
    };
}

ipcMain.handle("th-reconciliation:run-query", (_event, password) => runThReconciliationQuery(password));

function createMainWindow() {
    const win = new BrowserWindow({
        autoHideMenuBar: true, icon: path.join(__dirname, "assets/pepsico.ico"), webPreferences: {
            preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false,
        },
    });
    win.maximize();
    win.loadFile(path.join(__dirname, "../dist/index.html"));
}

app.whenReady().then(() => {
    const splash = new BrowserWindow({
        width: 600, height: 300, frame: false, alwaysOnTop: true, resizable: false, movable: false,
    });
    splash.loadFile(path.join(__dirname, "splash.html"));
    setTimeout(() => {
        splash.close();
        createMainWindow();
    }, 2500);
});