// VoucherDecryption.jsx
import React, { useState } from "react";
import Papa from "papaparse";
import { AlertCircle, Download, Upload } from "lucide-react";
import pepsicoLogo from "../assets/pepsico_logo.png";
import { decryptVoucher } from "../services/DecryptService";
import * as XLSX from "xlsx";

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
                parsedRows.push({ Decrypted: decrypted, Encrypted: encrypted, ...r });
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
            const str = String(val).replace(/\r?\n|\r/g, " "); // replace line breaks
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
            if (progressEl) progressEl.textContent = `Exporting CSV… ${processed.toLocaleString()} / ${total.toLocaleString()} (${percent}%)`;

            if (processed < total) {
                setTimeout(processChunk, 0);
            } else {
                const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filenameCsv;
                a.click();

                // // Trigger XLSX conversion after CSV is ready
                // convertCsvBlobToXlsx(blob);

                if (progressEl) progressEl.remove();
                alert(`✅ CSV export complete! Total rows: ${total.toLocaleString()}`);
            }
        };

        processChunk();
    };



    const rowCount = rows.length;

    return (
        <div className="min-h-screen w-full bg-gradient-to-b from-blue-900 via-blue-950 to-blue-900 text-gray-100 p-8 font-sans flex flex-col items-center">
            <div className="flex items-center justify-center gap-6 mb-10">
                <img src={pepsicoLogo} alt="Pepsico Logo" className="h-20" />
                <h1 className="text-5xl font-extrabold text-white tracking-wide">
                    Voucher Decryption Tool
                </h1>
            </div>

            <div className="flex flex-col items-center gap-8">
                <label className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-xl cursor-pointer text-white font-bold text-lg shadow-2xl flex items-center gap-3 transition">
                    <Upload size={28} /> Upload CSV File
                    <input type="file" accept=".csv" onChange={handleUpload} className="hidden" />
                </label>

                <div className="mt-4">
                    <div className="flex justify-between items-center mb-1">
        <span className="text-gray-300 font-medium">
          Select Query for object_cep_digital_code table:
        </span>

                        {/* Copy button */}
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(queryString);
                            }}
                            className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1 rounded shadow"
                        >
                            Copy
                        </button>
                    </div>

                    <pre className="text-gray-200 bg-gray-800 px-3 py-2 rounded text-sm whitespace-pre-wrap">
{`SELECT *
  FROM object_cep_digital_code;`}
      </pre>

                    <p>                    Decrypted values will be computed and included in the exported XLSX.
                    </p>
                </div>

                {processing && (
                    <div className="text-yellow-400 font-bold text-xl animate-pulse">
                        Processing {rows.length.toLocaleString()} rows...
                    </div>
                )}

                {rowCount > 0 && (
                    <div className="export-buttons flex flex-col items-center gap-6 w-full max-w-4xl">
                        <div className="w-full text-center">
                            <button
                                onClick={exportCsvOptimized}
                                className="bg-orange-600 hover:bg-orange-700 px-10 py-5 rounded-xl text-white font-bold text-xl shadow-2xl flex items-center gap-4 mx-auto transition transform hover:scale-105"
                            >
                                <Download size={32} />
                                Export Decrypted CSV
                            </button>
                            <div id="csv-progress" className="mt-3 text-yellow-300 text-lg"></div>
                        </div>

                        <div className="mt-8 text-center bg-gray-900/70 px-8 py-6 rounded-xl border border-gray-700">
                            <p className="text-2xl font-bold text-white">
                                Loaded: <span className="text-cyan-400">{rowCount.toLocaleString()}</span> vouchers
                            </p>
                            <p className="text-gray-400 mt-2">
                                Columns: {Object.keys(rows[0] || {}).join(" • ")}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
