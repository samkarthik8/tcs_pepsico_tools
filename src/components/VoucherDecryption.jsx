// VoucherDecryption.jsx
import React, {useState} from "react";
import * as XLSX from "xlsx";
import CryptoJS from "crypto-js";
import {Download, Upload} from "lucide-react";
import pepsicoLogo from "../assets/pepsico_logo.png"; // optional, keep path as your project

// Constants (match Python)
const KEY_STR = "7563424859574547"; // 16 bytes
const KEY = CryptoJS.enc.Utf8.parse(KEY_STR);
const IV_LEN = 16;
const HMAC_LEN = 32;

// utility: convert Base64 string -> Uint8Array (handles padding & quotes)
function base64ToUint8Array(base64Str) {
    if (typeof base64Str !== "string") return null;
    let s = base64Str.trim().replace(/["'\n\r]/g, "");
    const missing = s.length % 4;
    if (missing) s += "=".repeat(4 - missing);
    try {
        const binary = atob(s);
        const len = binary.length;
        const arr = new Uint8Array(len);
        for (let i = 0; i < len; i++) arr[i] = binary.charCodeAt(i);
        return arr;
        // eslint-disable-next-line no-unused-vars
    } catch (e) {
        return null;
    }
}

// util: make WordArray from Uint8Array (CryptoJS)
function wordArrayFromU8(u8arr) {
    return CryptoJS.lib.WordArray.create(u8arr);
}

// compute HMAC-SHA256 as WordArray (given ciphertext WordArray)
function computeHmacSha256WordArray(cipherWA) {
    // HmacSHA256 accepts WordArray
    return CryptoJS.HmacSHA256(cipherWA, KEY);
}

// decrypt AES-CBC-PKCS7 (ciphertext bytes -> plaintext string)
function aesCbcPkcs7Decrypt(cipherBytes, ivBytes) {
    const ciphertextWA = wordArrayFromU8(cipherBytes);
    const ivWA = wordArrayFromU8(ivBytes);
    try {
        const decrypted = CryptoJS.AES.decrypt(
            {ciphertext: ciphertextWA},
            KEY,
            {iv: ivWA, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7}
        );
        const plain = decrypted.toString(CryptoJS.enc.Utf8);
        return plain || "[Decryption produced empty string]";
    } catch (e) {
        return `[Decryption failed: ${e && e.message ? e.message : e}]`;
    }
}

// main decrypt function mirroring Python logic
function decryptVoucher(ciphertextB64) {
    try {
        if (!ciphertextB64 || String(ciphertextB64).trim() === "") return "[Empty Code]";
        const bytes = base64ToUint8Array(String(ciphertextB64));
        if (!bytes) return "[Base64 decode failed]";

        if (bytes.length <= IV_LEN + HMAC_LEN) return "[Ciphertext too short]";

        const iv = bytes.slice(0, IV_LEN);
        const hmacReceived = bytes.slice(IV_LEN, IV_LEN + HMAC_LEN);
        const cipherBytes = bytes.slice(IV_LEN + HMAC_LEN);

        // Prepare WordArray for HMAC calculation using ciphertext bytes only
        const cipherWAforHmac = wordArrayFromU8(cipherBytes);
        const hmacCalcWA = computeHmacSha256WordArray(cipherWAforHmac);

        // convert to Uint8Array for comparision
        const hmacCalcHex = hmacCalcWA.toString(CryptoJS.enc.Hex);
        // helper: hex -> Uint8Array
        const hexToU8 = (hex) => {
            const arr = new Uint8Array(hex.length / 2);
            for (let i = 0; i < arr.length; i++) {
                arr[i] = parseInt(hex.substr(i * 2, 2), 16);
            }
            return arr;
        };
        const hmacCalcBytes = hexToU8(hmacCalcHex);

        // compare HMACs constant-time like (simple)
        if (hmacCalcBytes.length !== hmacReceived.length) {
            return "[HMAC verification failed]";
        }
        let ok = true;
        for (let i = 0; i < hmacReceived.length; i++) {
            if (hmacReceived[i] !== hmacCalcBytes[i]) {
                ok = false;
                break;
            }
        }
        if (!ok) return "[HMAC verification failed]";

        // AES decrypt
        return aesCbcPkcs7Decrypt(cipherBytes, iv);
    } catch (e) {
        return `[Decryption failed: ${e && e.message ? e.message : e}]`;
    }
}

export default function VoucherDecryptor() {
    const [rows, setRows] = useState(null);
    const [processing, setProcessing] = useState(false);

    // Read CSV using XLSX (read CSV string as workbook)
    const handleUpload = (ev) => {
        const file = ev.target.files && ev.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const csvText = e.target.result;
            try {
                // XLSX can read CSV string directly
                const wb = XLSX.read(csvText, {type: "string"});
                const sheet = wb.Sheets[wb.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sheet, {defval: ""}); // array of objects
                setRows(json);
            } catch (err) {
                console.error("Error parsing CSV:", err);
                alert("Failed to parse CSV. Make sure it's a valid CSV file.");
            }
        };
        reader.readAsText(file);
    };

    const exportXlsx = () => {
        if (!rows || !rows.length) {
            alert("No CSV data loaded.");
            return;
        }
        setProcessing(true);

        // original keys (column order) — use insertion order of Object.keys of first row
        const originalKeys = Object.keys(rows[0]);

        // Build AOA (array of arrays) with header row first
        const header = ["Decrypted", "Encrypted", ...originalKeys];

        const aoa = [header];

        for (const r of rows) {
            // Take Code column (case-sensitive). If the CSV header is 'Code' we use that; otherwise try variations
            const codeVal =
                r["Code"] ??
                r["code"] ??
                r["CODE"] ??
                (() => {
                    // fallback: try to find a header named 'Code' ignoring case
                    const foundKey = Object.keys(r).find((k) => k && k.toLowerCase() === "code");
                    return foundKey ? r[foundKey] : "";
                })();

            const encrypted = codeVal ?? "";
            const decrypted = encrypted ? decryptVoucher(encrypted) : "[No Code]";

            // build row following header order
            const rest = originalKeys.map((k) => (r[k] === undefined ? "" : r[k]));
            aoa.push([decrypted, encrypted, ...rest]);
        }

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Vouchers");

        // Format file name: Voucher Data DD-MMM-YYYY.xlsx (e.g. 02-Dec-2025)
        const date = new Date();
        const dd = String(date.getDate()).padStart(2, "0");
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const mmm = months[date.getMonth()];
        const yyyy = date.getFullYear();
        const filename = `Voucher Data ${dd}-${mmm}-${yyyy}.xlsx`;

        XLSX.writeFile(wb, filename);
        setProcessing(false);
    };

    return (
        <div
            className="min-h-screen w-full bg-gradient-to-b from-blue-900 via-blue-950 to-blue-900 text-gray-100 p-8 font-sans flex flex-col items-center">
            <div className="flex items-center justify-center gap-4 mb-8">
                <img src={pepsicoLogo} alt="Pepsico Logo" className="h-16"/>
                <h1 className="text-4xl font-extrabold text-white tracking-wide">
                    Voucher Decryption
                </h1>
            </div>

            <div className="flex gap-4">
                <label
                    className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg cursor-pointer text-white font-semibold shadow-lg transition-transform transform hover:scale-105 flex items-center gap-2">
                    <Upload size={18}/> Upload CSV
                    <input type="file" accept=".csv" onChange={handleUpload} className="hidden"/>
                </label>

                {rows && rows.length > 0 && (
                    <button
                        onClick={exportXlsx}
                        disabled={processing}
                        className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg text-white font-semibold shadow-lg flex items-center gap-2"
                    >
                        <Download size={18}/>
                        {processing ? "Processing..." : "Export XLSX"}
                    </button>
                )}
            </div>

            {rows && (
                <div className="mt-8 w-full max-w-4xl bg-gray-900 p-4 rounded-lg border border-gray-700">
                    <p className="text-gray-300 mb-2">
                        Loaded <strong>{rows.length}</strong> rows. First row columns:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {Object.keys(rows[0]).map((k) => (
                            <span key={k} className="px-3 py-1 bg-gray-800 rounded text-sm border border-gray-700">
                {k}
              </span>
                        ))}
                    </div>
                </div>
            )}
            {!rows && (
                <p className="text-gray-400 mt-6 leading-relaxed">
                    Upload a CSV of the <span
                    className="font-semibold text-gray-200">object_cep_digital_code</span> table.
                    <br/><br/>
                    <span className="text-gray-300 font-medium">Select Query for object_cep_digital_code table:</span>
                    <br/>
                    <code className="text-gray-200 bg-gray-800 px-2 py-1 rounded block mt-1">
                        SELECT *<br/>
                        FROM object_cep_digital_code;
                    </code>
                    <br/>
                    Decrypted values will be computed and included in the exported XLSX.
                </p>

            )}
        </div>
    );
}
