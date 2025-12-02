// VoucherDecryption.jsx
import React, {useState} from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import {AlertCircle, Download, Upload} from "lucide-react";
import pepsicoLogo from "../assets/pepsico_logo.png";
import {decryptVoucher} from "../services/DecryptService";

export default function VoucherDecryptor() {
    const [rows, setRows] = useState([]);
    const [processing, setProcessing] = useState(false);

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

    // Safe sanitiser – ESLint-friendly
    const sanitizeCell = (value) => {
        if (value == null) return "";
        return String(value)
            .replace(/\p{Co}/gu, "")           // removes ALL control chars (ESLint-safe)
            .replace(/\r?\n|\r/g, " ")         // line breaks → space
            .replace(/"/g, '""');              // escape quotes for CSV
    };

    // ───── CSV Streaming Export (always safe) ─────
    const exportCsvStreaming = async () => {
        if (!rows.length) return alert("No data to export.");

        const headers = Object.keys(rows[0]);
        const total = rows.length;
        const filename = `Decrypted_Vouchers_${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;

        let csvContent = "\uFEFF" + headers.join(",") + "\r\n";

        const chunkSize = 15000;
        let processed = 0;

        const processChunk = () => {
            const start = processed;
            const end = Math.min(start + chunkSize, total);
            const chunk = rows.slice(start, end);

            const lines = chunk.map((row) =>
                headers
                    .map((h) => `"${sanitizeCell(row[h])}"`)
                    .join(",")
            );

            csvContent += lines.join("\r\n") + "\r\n";
            processed = end;

            // Progress feedback
            const percent = Math.round((processed / total) * 100);
            const progressEl = document.getElementById("csv-progress");
            if (progressEl) {
                progressEl.textContent = `Exporting CSV… ${processed.toLocaleString()} / ${total.toLocaleString()} (${percent}%)`;
            }

            if (processed < total) {
                setTimeout(processChunk, 0);
            } else {
                // Trigger download
                const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);

                alert(`SUCCESS! Exported all ${total.toLocaleString()} rows as CSV`);
                if (progressEl) progressEl.remove();
            }
        };

        processChunk();
    };

    // ───── Safe XLSX Export (only for ≤80k rows) ─────
    const exportXlsxSafe = () => {
        if (!rows.length) return alert("No data to export.");

        const headers = Object.keys(rows[0]);

        const aoa = [
            headers,
            ...rows.map((row) =>
                headers.map((h) => {
                    const val = row[h] ?? "";
                    const s = String(val)
                        .replace(/\p{Co}/gu, "")
                        .replace(/\r?\n|\r/g, " ");
                    return s.length > 30000 ? s.substring(0, 30000) + "...[truncated]" : s;
                })
            ),
        ];

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws["!cols"] = headers.map(() => ({wch: 30}));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Decrypted Vouchers");

        const filename = `Decrypted_Vouchers_${new Date()
            .toISOString()
            .slice(0, 10)
            .replace(/-/g, "")}.xlsx`;
        XLSX.writeFile(wb, filename);
    };

    const rowCount = rows.length;

    return (
        <div
            className="min-h-screen w-full bg-gradient-to-b from-blue-900 via-blue-950 to-blue-900 text-gray-100 p-8 font-sans flex flex-col items-center">
            <div className="flex items-center justify-center gap-6 mb-10">
                <img src={pepsicoLogo} alt="Pepsico Logo" className="h-20"/>
                <h1 className="text-5xl font-extrabold text-white tracking-wide">
                    Voucher Decryption Tool
                </h1>
            </div>

            <div className="flex flex-col items-center gap-8">
                <label
                    className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-xl cursor-pointer text-white font-bold text-lg shadow-2xl flex items-center gap-3 transition">
                    <Upload size={28}/> Upload CSV File
                    <input type="file" accept=".csv" onChange={handleUpload} className="hidden"/>
                </label>

                {processing && (
                    <div className="text-yellow-400 font-bold text-xl animate-pulse">
                        Processing {rows.length.toLocaleString()} rows...
                    </div>
                )}

                {/* Export Section */}
                {rowCount > 0 && (
                    <div className="export-buttons flex flex-col items-center gap-6 w-full max-w-4xl">
                        {/* CSV – always available */}
                        <div className="w-full text-center">
                            <button
                                onClick={exportCsvStreaming}
                                className="bg-orange-600 hover:bg-orange-700 px-10 py-5 rounded-xl text-white font-bold text-xl shadow-2xl flex items-center gap-4 mx-auto transition transform hover:scale-105"
                            >
                                <Download size={32}/>
                                EXPORT AS CSV (Recommended – works with any size)
                            </button>
                            <div id="csv-progress" className="mt-3 text-yellow-300 text-lg"></div>
                        </div>

                        {/* XLSX – only when safe */}
                        {rowCount <= 80000 ? (
                            <button
                                onClick={exportXlsxSafe}
                                className="bg-green-600 hover:bg-green-700 px-8 py-4 rounded-xl text-white font-bold flex items-center gap-3 shadow-xl transition"
                            >
                                <Download size={24}/>
                                Export as XLSX (fast for small files)
                            </button>
                        ) : (
                            <div
                                className="flex items-center gap-3 bg-yellow-900/50 px-6 py-4 rounded-lg border border-yellow-600">
                                <AlertCircle size={24} className="text-yellow-400"/>
                                <span className="text-yellow-300 font-semibold">
                  XLSX disabled for large files → Use CSV (opens perfectly in Excel)
                </span>
                            </div>
                        )}

                        {/* Summary */}
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