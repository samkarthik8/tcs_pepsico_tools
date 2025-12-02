// VoucherDecryption.jsx
import React, {useState} from "react";
import Papa from "papaparse";
import {Download, Upload} from "lucide-react";
import pepsicoLogo from "../assets/pepsico_logo.png";
import {decryptVoucher} from "../services/DecryptService";

export default function VoucherDecryptor() {
    const [rows, setRows] = useState([]);
    const [processing, setProcessing] = useState(false);
    const queryString = "SELECT * FROM object_cep_digital_code;";

    const handleUpload = (ev) => {
        const file = ev.target.files?.[0];
        if (!file) return;

        setProcessing(true);
        const parsedRows = [];

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
                parsedRows.push({Decrypted: decrypted, Encrypted: encrypted, ...r});
            },
            complete: () => {
                setRows(parsedRows);
                setProcessing(false);
            },
            error: (err) => {
                console.error("CSV parse error:", err);
                alert("Failed to parse CSV file.");
                setProcessing(false);
            },
        });
    };

    // ───── Optimized CSV export for huge files ─────
    const exportCsvOptimized = () => {
        if (!rows.length) return alert("No data to export.");

        const headers = Object.keys(rows[0]);
        const total = rows.length;
        const filenameCsv = `Decrypted_Vouchers_${new Date().toISOString().slice(0, 10)}.csv`;

        let csvContent = "\uFEFF" + headers.join(",") + "\n"; // BOM for Excel
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
                progressEl.textContent = `Exporting CSV… ${processed.toLocaleString()} / ${total.toLocaleString()} (${percent}%)`;
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

    const rowCount = rows.length;

    return (
        <div
            className="min-h-screen w-full bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-gray-100 p-10 font-sans flex flex-col items-center">

            {/* Header */}
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

            {/* Main Container */}
            <div
                className="flex flex-col items-center gap-10 w-full max-w-5xl bg-white/5 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/10">

                {/* Upload */}
                <label
                    className="bg-blue-600 hover:bg-blue-700 px-10 py-5 rounded-2xl cursor-pointer text-white font-bold text-xl shadow-xl flex items-center gap-4 transition-transform hover:scale-[1.04] active:scale-95">
                    <Upload size={30}/> Upload CSV File
                    <input type="file" accept=".csv" onChange={handleUpload} className="hidden"/>
                </label>

                {/* Query Section */}
                <div className="w-full bg-black/20 p-6 rounded-2xl border border-white/10 shadow-inner">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-xl text-gray-300 font-semibold">
                            Select Query for object_cep_digital_code table:
                        </span>

                        <button
                            onClick={() => navigator.clipboard.writeText(queryString)}
                            className="text-xl bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded shadow transition"
                        >
                            Copy
                        </button>
                    </div>

                    <pre
                        className="text-gray-100 bg-gray-800/80 px-4 py-3 rounded-xl text-sm whitespace-pre-wrap border border-gray-700 shadow-md">
{`SELECT *
  FROM object_cep_digital_code;`}
                    </pre>

                    <p className="mt-3 text-xl text-gray-300 text-sm">
                        Decrypted values will be computed and included in the exported XLSX.
                    </p>
                </div>

                {/* Processing Indicator */}
                {processing && (
                    <div className="text-yellow-400 font-bold text-2xl animate-pulse drop-shadow-md">
                        Processing {rows.length.toLocaleString()} rows...
                    </div>
                )}

                {/* Export Section */}
                {rowCount > 0 && (
                    <div className="flex flex-col items-center gap-8 w-full">
                        <button
                            onClick={exportCsvOptimized}
                            className="bg-orange-600 hover:bg-orange-700 px-12 py-6 rounded-2xl text-white font-extrabold text-2xl shadow-2xl flex items-center gap-4 transition-transform hover:scale-[1.05] active:scale-95"
                        >
                            <Download size={36}/>
                            Export Decrypted CSV
                        </button>

                        <div id="csv-progress" className="text-yellow-300 text-lg"></div>

                        {/* Stats Card */}
                        <div
                            className="bg-gray-900/60 px-10 py-8 rounded-2xl border border-gray-700 shadow-xl text-center">
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
