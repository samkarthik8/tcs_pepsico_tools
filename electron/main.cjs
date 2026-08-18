const {app, BrowserWindow, ipcMain} = require("electron");
const path = require("path");
const https = require("https");
const TRINO = {
    host: "b2b-trinodb.dps.gw01.aks01.suk.prod.azure.intra.pepsico.com",
    port: 443,
    username: "pepconndb06",
};
const TRINO_PASSWORD = "yKiFN3Fh(oNo=bec";
// noinspection SqlNoDataSourceInspection
const TH_RECONCILIATION_QUERY = `SELECT store_id     AS "Store",
                                        total_points AS "Points Balance"
                                 FROM loyalty_amesa.th_prod.reward_engine_user
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
                ...(body ? {
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

async function runThReconciliationQuery() {
    let page = await trinoRequest(
        "/v1/statement",
        TH_RECONCILIATION_QUERY,
        TRINO_PASSWORD
    );

    const rows = [];
    let columns = page.columns || [];

    while (true) {
        if (page.error) {
            throw new Error(
                page.error.message ||
                "Trino could not run the query."
            );
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

        page = await trinoRequest(
            `${nextUrl.pathname}${nextUrl.search}`,
            null,
            TRINO_PASSWORD
        );
    }

    return {
        columns: columns.map(column => column.name),
        rows,
        truncated: false
    };
}

ipcMain.handle(
    "th-reconciliation:run-query",
    () => runThReconciliationQuery()
);

async function runTrinoConnectionQuery(query) {
    if (typeof query !== "string" || !query.trim()) {
        throw new Error("Enter a query to run.");
    }

    // Remove SQL comments
    const stripped = query
        .replace(/--[^\n]*/g, "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .trim();

    // Remove trailing semicolon(s)
    const cleanedQuery = stripped
        .replace(/;+\s*$/, "")
        .trim();

    // Allow only SELECT queries
    if (!/^SELECT\b/i.test(cleanedQuery)) {
        throw new Error("Only SELECT queries are permitted.");
    }

    // Prevent multiple SQL statements
    if (cleanedQuery.includes(";")) {
        throw new Error("Only one SELECT statement is permitted.");
    }

    console.log("Executing Trino query:");
    console.log(cleanedQuery);

    let page = await trinoRequest(
        "/v1/statement",
        cleanedQuery,
        TRINO_PASSWORD
    );

    const rows = [];
    let columns = page.columns || [];

    while (true) {
        if (page.error) {
            throw new Error(
                page.error.message ||
                "Trino could not run the query."
            );
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

        page = await trinoRequest(
            `${nextUrl.pathname}${nextUrl.search}`,
            null,
            TRINO_PASSWORD
        );
    }

    return {
        columns: columns.map(column => column.name),
        rows
    };
}

ipcMain.handle(
    "trino-connection:run-query",
    (_event, query) =>
        runTrinoConnectionQuery(query)
);

async function runCustomerRewardsHistoryQuery(catalog, schema, storeId, count) {
    if (!catalog || !schema) {
        throw new Error("Database mapping for this country is not yet configured.");
    }

    if (typeof storeId !== "string" || !storeId.trim()) {
        throw new Error("Enter an ERP Customer (Store ID).");
    }

    const safeStoreId = storeId.trim().replace(/'/g, "''");

    const safeCount = parseInt(count, 10);

    if (
        isNaN(safeCount) ||
        safeCount <= 0 ||
        safeCount > 10000
    ) {
        throw new Error("Invalid record count.");
    }

    const query = `SELECT al.store_id             AS "Store",
                          al.id                   AS "Event ID",
                          al.name                 AS "Activity",
                          al.activity_config_id   AS "Activity ID",
                          al.points_before        AS "Points Before",
                          al.points_awarded       AS "Points Awarded",
                          al.points_balance_after AS "Points After",
                          CASE
                              WHEN al.remarks IS NOT NULL THEN al.remarks
                              WHEN al.message IS NOT NULL THEN ac.title
                              ELSE ac.title
                              END                 AS "Description",
                          al.created_at           AS "Creation Date"
                   FROM ${catalog}.${schema}.activity_log al
                            LEFT JOIN ${catalog}.${schema}.activity_config ac
                                      ON ac.id = al.activity_config_id
                   WHERE al.store_id = '${safeStoreId}'
                   ORDER BY al.created_at DESC
                       LIMIT ${safeCount}`;

    let page = await trinoRequest(
        "/v1/statement",
        query,
        TRINO_PASSWORD
    );

    const rows = [];
    let columns = page.columns || [];

    while (true) {
        if (page.error) {
            throw new Error(
                page.error.message ||
                "Trino could not run the query."
            );
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

        page = await trinoRequest(
            `${nextUrl.pathname}${nextUrl.search}`,
            null,
            TRINO_PASSWORD
        );
    }

    return {
        columns: columns.map((c) => c.name),
        rows
    };
}

ipcMain.handle(
    "customer-rewards:fetch-history",
    (_event, catalog, schema, storeId, count) =>
        runCustomerRewardsHistoryQuery(
            catalog,
            schema,
            storeId,
            count
        )
);


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