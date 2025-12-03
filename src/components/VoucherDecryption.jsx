// VoucherDecryption.jsx
import React, {useState} from "react";
import Papa from "papaparse";
import {Download, Loader2, Upload} from "lucide-react";
import pepsicoLogo from "../assets/pepsico_logo.png";
import {decryptVoucher} from "../services/DecryptService";

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
    const countRows = (file) => new Promise((resolve) => {
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

        // Pass 1: count rows
        const rowEstimate = await countRows(file);
        setTotalCount(rowEstimate);

        const parsedRows = [];

        // Pass 2: decrypt
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            worker: true,
            step: (results) => {
                const r = results.data;
                const codeKey = Object.keys(r).find((k) => k.toLowerCase() === "code") || "Code";
                const encrypted = r[codeKey] || "";
                const decrypted = encrypted ? decryptVoucher(encrypted) : "[No Code]";

                parsedRows.push({
                    Decrypted: decrypted,
                    Encrypted: encrypted,
                    ...r
                });

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
    // Optimized CSV Export
    // ────────────────────────────────────────────────
    const exportCsvOptimized = () => {
        if (!rows.length) return alert("No data to export.");

        const headers = Object.keys(rows[0]);
        const total = rows.length;
        const filenameCsv = `Decrypted_Vouchers_${new Date().toISOString().slice(0, 10)}.csv`;
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
                const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filenameCsv;
                a.click();
            }
        };

        processChunk();
    };

    const percentDone = totalCount > 0 ? Math.round((parsedCount / totalCount) * 100) : 0;
    const rowCount = rows.length;

    return (
        <div
            className="min-h-screen w-full bg-gradient-to-br from-[#001f3f] via-[#004B93] to-[#001f3f] text-white p-10 font-sans flex flex-col items-center">
            {/* Header */}
            <div className="flex items-center justify-center gap-8 mb-14">
                <img src={pepsicoLogo} alt="PepsiCo Logo" className="h-28 drop-shadow-2xl"/>
                <h1 className="text-5xl font-extrabold text-white tracking-wider drop-shadow-2xl">
                    Voucher Decryption Tool
                </h1>
            </div>

            {/* Main Card */}
            <div
                className="flex flex-col items-center gap-10 w-full max-w-5xl bg-white/10 backdrop-blur-2xl p-12 rounded-3xl shadow-2xl border border-white/20">

                {/* Upload Button - Pepsi Blue */}
                <label
                    className="bg-[#004B93] hover:bg-[#003d7a] active:bg-[#002b5b] px-12 py-6 rounded-2xl cursor-pointer text-white font-bold text-xl shadow-2xl flex items-center gap-5 transition-all hover:scale-105 active:scale-98 border-2 border-[#00AEEF]/50">
                    <Upload size={34}/>
                    Upload CSV File
                    <input type="file" accept=".csv" onChange={handleUpload} className="hidden"/>
                </label>

                {/* Query Box */}
                <div className="w-full bg-black/30 p-8 rounded-2xl border border-white/10 shadow-2xl backdrop-blur">
                    <div className="flex justify-between items-center mb-4">
            <span className="text-gray-200 font-semibold text-lg">
              Select Query for object_cep_digital_code table:
            </span>
                        <button
                            onClick={() => navigator.clipboard.writeText(queryString)}
                            className="text-sm bg-[#E4002B] hover:bg-[#c70024] text-white px-4 py-2 rounded-lg shadow-lg transition font-medium"
                        >
                            Copy Query
                        </button>
                    </div>
                    <pre
                        className="text-[#00AEEF] bg-[#001f3f]/80 px-6 py-4 rounded-xl text-sm font-mono border border-[#00AEEF]/30 shadow-inner overflow-x-auto">
            {`SELECT *
              FROM object_cep_digital_code;`}
          </pre>
                    <p className="mt-4 text-gray-300 text-sm">
                        Decrypted values will be computed and included in the exported file.
                    </p>
                </div>

                {/* Processing State */}
                {processing && (
                    <div className="flex flex-col items-center gap-6 w-full mt-6">
                        <Loader2 className="w-14 h-14 text-[#00AEEF] animate-spin"/>
                        <div className="text-[#00AEEF] text-2xl font-bold">Processing Vouchers...</div>

                        {/* Progress Bar - Pepsi Style */}
                        <div
                            className="w-3/4 h-5 bg-[#001f3f]/80 rounded-full overflow-hidden shadow-inner border-2 border-[#004B93]">
                            <div
                                className="h-full bg-gradient-to-r from-[#004B93] via-[#00AEEF] to-[#004B93] transition-all duration-500 shadow-lg"
                                style={{width: `${percentDone}%`}}
                            ></div>
                        </div>
                        <div className="text-[#00AEEF] font-bold text-lg">{percentDone}% Completed</div>
                    </div>
                )}

                {/* Success State */}
                {rowCount > 0 && !processing && (
                    <div className="flex flex-col items-center gap-10 w-full">
                        {/* Export Button - Pepsi Red */}
                        <button
                            onClick={exportCsvOptimized}
                            className="bg-[#E4002B] hover:bg-[#c70024] active:bg-[#a5001e] px-14 py-7 rounded-2xl text-white font-extrabold text-2xl shadow-2xl flex items-center gap-5 transition-all hover:scale-105 active:scale-98 border-4 border-white/30"
                        >
                            <Download size={40}/>
                            Export Decrypted CSV
                        </button>

                        <div id="csv-progress" className="text-[#00AEEF] text-lg font-medium"></div>

                        {/* Summary Card */}
                        <div
                            className="bg-gradient-to-br from-[#004B93]/90 to-[#001f3f]/90 px-12 py-10 rounded-3xl border-2 border-[#00AEEF]/50 shadow-2xl text-center w-full">
                            <p className="text-4xl font-extrabold text-white drop-shadow-lg">
                                Loaded: <span className="text-[#E4002B]">{rowCount.toLocaleString()}</span> vouchers
                            </p>
                            <p className="text-gray-300 mt-4 text-sm font-medium">
                                Columns: {Object.keys(rows[0] || {}).join(" • ")}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}