// THReconciliation.jsx
import React, {useMemo, useState} from "react";
import Papa from "papaparse";
import {Database, Download, Loader2} from "lucide-react";
import pepsicoLogo from "../assets/pepsico_logo.png";
import HomeButton from "./ui/HomeButton.jsx";

const QUERY_STRING = `SELECT
    store_id AS "Store",
    total_points AS "Points Balance"
FROM th_prod.reward_engine_user
WHERE total_points > 0;`;

const DISPLAY_ROW_LIMIT = 50;

export default function THReconciliation() {
    const [trinoPassword, setTrinoPassword] = useState("");
    const [queryRows, setQueryRows] = useState([]);
    const [queryColumns, setQueryColumns] = useState([]);
    const [queryLoading, setQueryLoading] = useState(false);
    const [queryError, setQueryError] = useState("");
    // const [queryTruncated, setQueryTruncated] = useState(false);

    const displayedRows = useMemo(
        () => queryRows.slice(0, DISPLAY_ROW_LIMIT),
        [queryRows]
    );

    const runTrinoQuery = async () => {
        if (!window.thReconciliation?.runQuery) {
            setQueryError("This feature is available only in the installed EXE.");
            return;
        }
        if (!trinoPassword) {
            setQueryError("Enter your Trino password.");
            return;
        }

        setQueryLoading(true);
        setQueryError("");
        setQueryRows([]);
        setQueryColumns([]);
        // setQueryTruncated(false);

        try {
            const result = await window.thReconciliation.runQuery(trinoPassword);
            setQueryColumns(result.columns || []);
            setQueryRows(result.rows || []);
            // setQueryTruncated(Boolean(result.truncated));
        } catch (error) {
            setQueryError(error.message || "Unable to retrieve data from Trino.");
        } finally {
            setQueryLoading(false);
        }
    };

    const exportQueryCsv = () => {
        if (!queryColumns.length) return;

        const csv = Papa.unparse({
            fields: queryColumns,
            data: queryRows,
        });
        const blob = new Blob(["\uFEFF", csv], {type: "text/csv;charset=utf-8;"});
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `TH_Reconciliation_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-[#001f3f] via-[#004B93] to-[#001f3f] text-white p-10 font-sans flex flex-col items-center">
            <HomeButton/>
            <div className="flex items-center justify-center gap-8 mb-14">
                <img src={pepsicoLogo} alt="PepsiCo Logo" className="h-28 drop-shadow-2xl"/>
                <h1 className="text-5xl font-extrabold text-white tracking-wider drop-shadow-2xl">TH Reconciliation</h1>
            </div>

            <div className="flex flex-col items-center gap-8 w-full max-w-5xl bg-white/10 backdrop-blur-2xl p-12 rounded-3xl shadow-2xl border border-white/20">
                <div className="w-full bg-black/30 p-8 rounded-2xl border border-white/10 shadow-2xl backdrop-blur">
                    <div className="flex justify-between items-center mb-4 gap-4">
                        <span className="text-gray-200 font-semibold text-lg">Trino query for reward-engine user balances:</span>
                        <button onClick={() => navigator.clipboard.writeText(QUERY_STRING)} className="shrink-0 text-sm bg-[#E4002B] hover:bg-[#c70024] text-white px-4 py-2 rounded-lg shadow-lg transition font-medium">
                            Copy Query
                        </button>
                    </div>
                    <pre className="text-[#00AEEF] bg-[#001f3f]/80 px-6 py-4 rounded-xl text-sm font-mono border border-[#00AEEF]/30 shadow-inner overflow-x-auto">{QUERY_STRING}</pre>
                    <p className="mt-4 text-gray-300 text-sm">Enter your password to run this approved read-only query. Your password is not saved by the app.</p>
                </div>

                <div className="w-full flex flex-col gap-4">
                    <label className="text-gray-100 font-semibold" htmlFor="trino-password">Trino password</label>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <input id="trino-password" type="password" value={trinoPassword}
                               onChange={(event) => setTrinoPassword(event.target.value)}
                               onKeyDown={(event) => event.key === "Enter" && runTrinoQuery()}
                               placeholder="Enter password"
                               className="flex-1 px-5 py-4 rounded-xl bg-white text-[#001f3f] border-2 border-[#00AEEF]/50 outline-none"
                               autoComplete="current-password"/>
                        <button onClick={runTrinoQuery} disabled={queryLoading}
                                className="bg-[#E4002B] disabled:opacity-60 hover:bg-[#c70024] px-7 py-4 rounded-xl font-bold flex items-center justify-center gap-3">
                            {queryLoading ? <Loader2 className="animate-spin"/> : <Database/>}
                            {queryLoading ? "Running query..." : "Run Trino Query"}
                        </button>
                    </div>
                    {queryError && <p className="text-red-200 font-medium">{queryError}</p>}
                </div>

                {queryColumns.length > 0 && !queryLoading && (
                    <div className="w-full overflow-x-auto rounded-2xl border border-white/20">
                        <div className="px-5 py-4 bg-black/30 font-semibold flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                        <span>
    Showing {displayedRows.length.toLocaleString()} of {queryRows.length.toLocaleString()} retrieved rows
</span>
                            <button onClick={exportQueryCsv} className="bg-[#E4002B] hover:bg-[#c70024] px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2">
                                <Download size={18}/> Export query output CSV
                            </button>
                        </div>
                        <table className="w-full text-left bg-white/10">
                            <thead className="bg-[#001f3f]/90 text-[#00AEEF]"><tr>
                                {queryColumns.map((column) => <th key={column} className="px-5 py-3">{column}</th>)}
                            </tr></thead>
                            <tbody>{displayedRows.map((row, rowIndex) => (
                                <tr key={rowIndex} className="border-t border-white/10">
                                    {queryColumns.map((_, columnIndex) => <td key={columnIndex} className="px-5 py-3">{row[columnIndex] ?? ""}</td>)}
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
