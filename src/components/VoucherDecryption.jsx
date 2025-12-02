// VoucherDecryption.jsx
import React, { useState } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Download, Upload } from "lucide-react";
import pepsicoLogo from "../assets/pepsico_logo.png";
import { decryptVoucher } from "../services/DecryptService"; // path to your file

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
            worker: true, // offloads parsing to worker
            step: (results) => {
                const r = results.data;

                // find Code column (case-insensitive)
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
                alert("Failed to parse CSV.");
                setProcessing(false);
            },
        });
    };

    const exportXlsx = () => {
        if (!rows.length) return alert("No data to export.");
        const header = Object.keys(rows[0]);
        const aoa = [header, ...rows.map((r) => header.map((k) => r[k] || ""))];

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");

        const date = new Date();
        const filename = `Voucher Data ${String(date.getDate()).padStart(2,"0")}-${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][date.getMonth()]}-${date.getFullYear()}.xlsx`;

        XLSX.writeFile(wb, filename);
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-b from-blue-900 via-blue-950 to-blue-900 text-gray-100 p-8 font-sans flex flex-col items-center">
            <div className="flex items-center justify-center gap-4 mb-8">
                <img src={pepsicoLogo} alt="Pepsico Logo" className="h-16"/>
                <h1 className="text-4xl font-extrabold text-white tracking-wide">Voucher Decryption</h1>
            </div>

            <div className="flex gap-4">
                <label className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg cursor-pointer text-white font-semibold shadow-lg flex items-center gap-2">
                    <Upload size={18}/> Upload CSV
                    <input type="file" accept=".csv" onChange={handleUpload} className="hidden"/>
                </label>

                {rows.length > 0 && (
                    <button
                        onClick={exportXlsx}
                        disabled={processing}
                        className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg text-white font-semibold shadow-lg flex items-center gap-2"
                    >
                        <Download size={18}/>
                        {processing ? "Processing..." : "Export Decrypted XLSX"}
                    </button>
                )}
            </div>

            {rows.length > 0 && (
                <div className="mt-8 w-full max-w-4xl bg-gray-900 p-4 rounded-lg border border-gray-700">
                    <p className="text-gray-300 mb-2">Loaded <strong>{rows.length}</strong> rows. Columns:</p>
                    <div className="flex flex-wrap gap-2">
                        {Object.keys(rows[0]).map((k) => (
                            <span key={k} className="px-3 py-1 bg-gray-800 rounded text-sm border border-gray-700">{k}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
