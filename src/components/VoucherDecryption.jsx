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

    const sanitizeCell = (value) => {
        if (value == null) return "";
        return String(value)
            .replace(/\p{Co}/gu, "")
            .replace(/\r?\n|\r/g, " ")
            .replace(/"/g, '""');
    };

    // ───── CSV streaming export (for huge files) ─────
    const exportCsvThenXlsx = () => {
        if (!rows.length) return alert("No data to export.");

        const headers = Object.keys(rows[0]);
        const total = rows.length;
        const filenameCsv = `Decrypted_Vouchers_${new Date().toISOString().slice(0, 10)}.csv`;

        let csvContent = "\uFEFF" + headers.join(",") + "\r\n";
        const chunkSize = 15000;
        let processed = 0;

        const processChunk = () => {
            const start = processed;
            const end = Math.min(start + chunkSize, total);
            const chunk = rows.slice(start, end);

            const lines = chunk.map((row) =>
                headers.map((h) => `"${sanitizeCell(row[h])}"`).join(",")
            );

            csvContent += lines.join("\r\n") + "\r\n";
            processed = end;

            const percent = Math.round((processed / total) * 100);
            const progressEl = document.getElementById("csv-progress");
            if (progressEl) progressEl.textContent = `Exporting CSV… ${processed.toLocaleString()} / ${total.toLocaleString()} (${percent}%)`;

            if (processed < total) {
                setTimeout(processChunk, 0);
            } else {
                // CSV download
                const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filenameCsv;
                a.click();

                // Trigger XLSX conversion after CSV is complete
                convertCsvBlobToXlsx(blob);

                if (progressEl) progressEl.remove();
                alert(`✅ CSV export complete! Total rows: ${total.toLocaleString()}`);
            }
        };

        processChunk();
    };

    // ───── XLSX conversion after large CSV is created ─────
    const convertCsvBlobToXlsx = async (blob) => {
        try {
            const text = await blob.text(); // read the CSV content
            const workbook = XLSX.utils.book_new();

            // Split large CSV into chunks of 50k rows to avoid memory issues
            const lines = text.split(/\r?\n/).filter(Boolean);
            if (lines.length < 2) return;

            const headers = lines[0].split(",");
            const chunkSize = 50000;

            for (let i = 1; i < lines.length; i += chunkSize) {
                const chunk = lines.slice(i, i + chunkSize).map(line =>
                    line.split(",").map(cell => cell.replace(/^"|"$/g, ""))
                );
                const ws = XLSX.utils.aoa_to_sheet([headers, ...chunk]);
                XLSX.utils.book_append_sheet(workbook, ws, `Sheet ${Math.floor(i / chunkSize) + 1}`);
            }

            const filenameXlsx = `Decrypted_Vouchers_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(workbook, filenameXlsx);
            alert("✅ XLSX conversion complete!");
        } catch (err) {
            console.error("XLSX conversion failed:", err);
            alert("❌ Failed to convert CSV to XLSX.");
        }
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

                {processing && (
                    <div className="text-yellow-400 font-bold text-xl animate-pulse">
                        Processing {rows.length.toLocaleString()} rows...
                    </div>
                )}

                {rowCount > 0 && (
                    <div className="export-buttons flex flex-col items-center gap-6 w-full max-w-4xl">
                        <div className="w-full text-center">
                            <button
                                onClick={exportCsvThenXlsx}
                                className="bg-orange-600 hover:bg-orange-700 px-10 py-5 rounded-xl text-white font-bold text-xl shadow-2xl flex items-center gap-4 mx-auto transition transform hover:scale-105"
                            >
                                <Download size={32} />
                                EXPORT CSV → XLSX
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
