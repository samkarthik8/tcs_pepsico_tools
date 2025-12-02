// VoucherDecryption.jsx
import React, { useState } from "react";
import Papa from "papaparse";
import { AlertCircle, Download, Upload, Loader2 } from "lucide-react";
import pepsicoLogo from "../assets/pepsico_logo.png";
import { decryptVoucher } from "../services/DecryptService";
import * as XLSX from "xlsx";

export default function VoucherDecryptor() {
    const [rows, setRows] = useState([]);
    const [processing, setProcessing] = useState(false);

    // NEW: live parsed row counter + total rows counter
    const [parsedCount, setParsedCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    const queryString = "SELECT * FROM object_cep_digital_code;";

    // ----------------------------------------------------
    // COUNT ROWS FIRST (lightweight pass)
    // ----------------------------------------------------
    const countRows = (file) =>
        new Promise((resolve) => {
            let count = 0;
            Papa.parse(file, {
                worker: true,
                skipEmptyLines: true,
                step: () => {
                    count++;
                },
                complete: () => resolve(count),
            });
        });

    const handleUpload = async (ev) => {
        const file = ev.target.files?.[0];
        if (!file) return;

        setProcessing(true);
        setParsedCount(0);

        // Pass 1: count rows for progress bar
        const rowEstimate = await countRows(file);
        setTotalCount(rowEstimate);

        const parsedRows = [];

        // Pass 2: actual decrypting pass
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            worker: true,
            step: (results) => {
                const r = results.data;
                const codeKey =
                    Object.keys(r).find((k) => k.toLowerCase() === "code") || "Code";
                const encrypted = r[codeKey] || "";
                const decrypted = encrypted ? decryptVoucher(encrypted) : "[No Code]";

                parsedRows.push({ Decrypted: decrypted, Encrypted: encrypted, ...r });

                // update progress
                if (parsedRows.length % 100 === 0) {
                    setParsedCount(parsedRows.length);
                }
            },
            complete: () => {
                setRows(parsedRows);
                setParsedCount(parsedRows.length);
                setProcessing(false);
            },
            error: (err) => {
                console.error("CSV parse error:", err);
                alert("Failed to parse CSV.");
                setProcessing(false);
                setParsedCount(0);
                setTotalCount(0);
            },
        });
    };

    // ────────────────────────────────────────────────
    //         Optimized CSV Export (unchanged)
    // ────────────────────────────────────────────────

    const exportCsvOptimized = () => {
        if (!rows.length) return alert("No data to export.");

        const headers = Object.keys(rows[0]);
        const total = rows.length;
        const filenameCsv = `Decrypted_Vouchers_${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;

        let csvContent = "\uFEFF" + headers.join(",") + "\n"; // BOM
        const chunkSize = 15000;
        let processed = 0;

        const quoteIfNeeded = (val) => {
            if (val == null) return "";
            const str = String(val).replace(/\r?\n|\r/g, " ");
            if (/[,"\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
            return str;
        };

        const processChunk = () => {
            const start = processed;
            const end = Math.min(start + chunkSize, total);
            const chunk = rows.slice(start, end);

            const lines = chunk.map((row) =>
                headers.map((h) => quoteIfNeeded(row[h])).join(",")
            );

            csvContent += lines.join("\n") + "\n";
            processed = end;

            const percent = Math.round((processed / total) * 100);
            const progressEl = document.getElementById("csv-progress");
            if (progressEl) {
                progressEl.textContent = `Exporting CSV… ${percent}%`;
            }

            if (processed < total) {
                setTimeout(processChunk, 0);
            } else {
                const blob = new Blob([csvContent], {
                    type: "text/csv;charset=utf-8;",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filenameCsv;
                a.click();
            }
        };

        processChunk();
    };

    const percentDone =
        totalCount > 0 ? Math.round((parsedCount / totalCount) * 100) : 0;

    const rowCount = rows.length;

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-gray-100 p-10 font-sans flex flex-col items-center">
            <div className="flex items-center justify-center gap-6 mb-14">
                <img
                    src={pepsicoLogo}
                    alt="PepsiCo Logo"
                    className="h-24 drop-shadow-xl"
                />
                <h1 className="text-5xl font-extrabold text-white tracking-wide drop-shadow-lg">
                    Voucher Decryption Tool
                </h1>
            </div>

            <div className="flex flex-col items-center gap-10 w-full max-w-5xl bg-white/5 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/10">
                <label className="bg-blue-600 hover:bg-blue-700 px-10 py-5 rounded-2xl cursor-pointer text-white font-bold text-xl shadow-xl flex items-center gap-4 transition-transform hover:scale-[1.04] active:scale-95">
                    <Upload size={30} /> Upload CSV File
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleUpload}
                        className="hidden"
                    />
                </label>

                {/* Query section (unchanged) */}
                <div className="w-full bg-black/20 p-6 rounded-2xl border border-white/10 shadow-inner">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-300 font-semibold">
                            Select Query for object_cep_digital_code table:
                        </span>

                        <button
                            onClick={() => navigator.clipboard.writeText(queryString)}
                            className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded shadow transition"
                        >
                            Copy
                        </button>
                    </div>

                    <pre className="text-gray-100 bg-gray-800/80 px-4 py-3 rounded-xl text-sm whitespace-pre-wrap border border-gray-700 shadow-md">
{`SELECT *
  FROM object_cep_digital_code;`}
                    </pre>

                    <p className="mt-3 text-gray-300 text-sm">
                        Decrypted values will be computed and included in the exported
                        XLSX.
                    </p>
                </div>

                {/* ───────────────────────────── */}
                {/*      NEW LOADING UI           */}
                {/* ───────────────────────────── */}
                {processing && (
                    <div className="flex flex-col items-center gap-4 w-full mt-4">
                        <Loader2 className="w-10 h-10 text-yellow-300 animate-spin" />

                        <div className="text-yellow-300 text-xl font-bold drop-shadow">
                            Processing...
                        </div>

                        {/* Progress bar */}
                        <div className="w-3/4 h-4 bg-gray-700 rounded-full overflow-hidden shadow-inner border border-gray-600">
                            <div
                                className="h-full bg-yellow-400 transition-all duration-200"
                                style={{ width: `${percentDone}%` }}
                            ></div>
                        </div>

                        <div className="text-gray-300 text-sm">
                            {percentDone}% completed
                        </div>
                    </div>
                )}

                {/* Export + Loaded Summary */}
                {rowCount > 0 && !processing && (
                    <div className="flex flex-col items-center gap-8 w-full">
                        <button
                            onClick={exportCsvOptimized}
                            className="bg-orange-600 hover:bg-orange-700 px-12 py-6 rounded-2xl text-white font-extrabold text-2xl shadow-2xl flex items-center gap-4 transition-transform hover:scale-[1.05] active:scale-95"
                        >
                            <Download size={36} />
                            Export Decrypted CSV
                        </button>

                        <div id="csv-progress" className="text-yellow-300 text-lg"></div>

                        <div className="bg-gray-900/60 px-10 py-8 rounded-2xl border border-gray-700 shadow-xl text-center">
                            <p className="text-3xl font-bold text-white drop-shadow">
                                Loaded:{" "}
                                <span className="text-cyan-400">
                                    {rowCount.toLocaleString()}
                                </span>{" "}
                                vouchers
                            </p>
                            <p className="text-gray-400 mt-3 text-sm">
                                Columns: {Object.keys(rows[0] || {}).join(" • ")}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
