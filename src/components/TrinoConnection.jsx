// TrinoConnection.jsx
import React, {useMemo, useState} from "react";
import Papa from "papaparse";
import {Database, Download, Loader2} from "lucide-react";
import pepsicoLogo from "../assets/pepsico_logo.png";
import HomeButton from "./ui/HomeButton.jsx";

// noinspection SqlNoDataSourceInspection
const PLACEHOLDER_QUERY = `SELECT store_id AS "Store",
total_points AS "Points Balance"
FROM loyalty_amesa.th_prod.reward_engine_user
WHERE total_points > 0`;

const DISPLAY_ROW_LIMIT = 50;

export default function TrinoConnection() {
    const [queryText, setQueryText] = useState("");
    const [queryRows, setQueryRows] = useState([]);
    const [queryColumns, setQueryColumns] = useState([]);
    const [queryLoading, setQueryLoading] = useState(false);
    const [queryError, setQueryError] = useState("");

    const displayedRows = useMemo(
        () => queryRows.slice(0, DISPLAY_ROW_LIMIT),
        [queryRows]
    );

    const runTrinoQuery = async () => {
        if (!window.trinoConnection?.runQuery) {
            setQueryError("This feature is available only in the installed EXE.");
            return;
        }

        if (!queryText.trim()) {
            setQueryError("Enter a query to run.");
            return;
        }

        setQueryLoading(true);
        setQueryError("");
        setQueryRows([]);
        setQueryColumns([]);

        try {
            const cleanedQuery = queryText
                .trim()
                .replace(/;+\s*$/, "");

            const result = await window.trinoConnection.runQuery(
                cleanedQuery
            );

            setQueryColumns(result.columns || []);
            setQueryRows(result.rows || []);
        } catch (error) {
            setQueryError(
                error.message || "Unable to retrieve data from Trino."
            );
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

        const blob = new Blob(["\uFEFF", csv], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;

        // Extract first table name from FROM clause
        const fromMatch = queryText.match(
            /\bFROM\s+(?:(?:["'`]?[\w$-]+["'`]?)\.)*(["'`]?[\w$-]+["'`]?)\b/i
        );

        let tableName = fromMatch?.[1] || "Trino_Query";

        // Remove SQL identifier quotes if present
        tableName = tableName.replace(/["'`]/g, "");

        const now = new Date();

        const day = String(now.getDate()).padStart(2, "0");

        const monthNames = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];

        const month = monthNames[now.getMonth()];
        const year = now.getFullYear();

        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");

        const filename =
            `${tableName}_${day}-${month}-${year}_T${hours}-${minutes}-${seconds}.csv`;

        link.download = filename;
        link.click();

        URL.revokeObjectURL(url);
    };

    return (
        <div
            className="min-h-screen w-full bg-gradient-to-br from-[#001f3f] via-[#004B93] to-[#001f3f] text-white p-10 font-sans flex flex-col items-center">
            <HomeButton/>
            <div className="flex items-center justify-center gap-8 mb-14">
                <img src={pepsicoLogo} alt="PepsiCo Logo" className="h-28 drop-shadow-2xl"/>
                <h1 className="text-5xl font-extrabold text-white tracking-wider drop-shadow-2xl">Trino Connection</h1>
            </div>

            <div
                className="flex flex-col items-center gap-8 w-full max-w-5xl bg-white/10 backdrop-blur-2xl p-12 rounded-3xl shadow-2xl border border-white/20">

                {/* Query input */}
                <div className="w-full flex flex-col gap-3">
                    <label
                        className="text-gray-100 font-semibold"
                        htmlFor="trino-query"
                    >
                        SQL Query

                        <span className="ml-2 text-xs font-normal text-gray-300">
            (SELECT only — include catalog and schema in the FROM clause)
        </span>
                    </label>

                    <textarea
                        id="trino-query"
                        value={queryText}
                        onChange={(e) => setQueryText(e.target.value)}
                        placeholder={PLACEHOLDER_QUERY}
                        rows={10}
                        spellCheck={false}
                        onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                                e.preventDefault();
                                runTrinoQuery();
                            }
                        }}
                        className="w-full px-5 py-4 rounded-xl bg-[#001f3f]/80 text-[#00AEEF] border-2 border-[#00AEEF]/30 outline-none font-mono text-sm resize-y focus:border-[#00AEEF]/70 transition placeholder:text-[#00AEEF]/30"
                    />
                </div>

                {/* Run Query + Error */}
                <div className="w-full flex flex-col gap-3 items-end">

                    <button
                        onClick={runTrinoQuery}
                        disabled={queryLoading}
                        className="bg-[#E4002B] disabled:opacity-60 hover:bg-[#c70024] px-7 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition"
                    >
                        {queryLoading ? (
                            <Loader2 className="animate-spin"/>
                        ) : (
                            <Database/>
                        )}

                        {queryLoading
                            ? "Running query..."
                            : "Run Query"}
                    </button>

                    {queryError && (
                        <p className="w-full text-red-200 font-medium">
                            {queryError}
                        </p>
                    )}
                </div>


                {/* Results table */}
                {queryColumns.length > 0 && !queryLoading && (
                    <div className="w-full overflow-x-auto rounded-2xl border border-white/20">
                        <div
                            className="px-5 py-4 bg-black/30 font-semibold flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                            <span>
                                Showing {displayedRows.length.toLocaleString()} of {queryRows.length.toLocaleString()} retrieved rows
                            </span>
                            <button
                                onClick={exportQueryCsv}
                                className="bg-[#E4002B] hover:bg-[#c70024] px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition"
                            >
                                <Download size={18}/> Export to CSV
                            </button>
                        </div>
                        <table className="w-full text-left bg-white/10">
                            <thead className="bg-[#001f3f]/90 text-[#00AEEF]">
                            <tr>
                                {queryColumns.map((col) => (
                                    <th key={col} className="px-5 py-3">{col}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {displayedRows.map((row, rowIndex) => (
                                <tr key={rowIndex} className="border-t border-white/10">
                                    {queryColumns.map((_, colIndex) => (
                                        <td key={colIndex} className="px-5 py-3">{row[colIndex] ?? ""}</td>
                                    ))}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
