// PointsBalance.jsx
import React, {useMemo, useState} from "react";
import Papa from "papaparse";
import {Download, Loader2} from "lucide-react";
import pepsicoLogo from "../assets/pepsico_logo.png";
import HomeButton from "./ui/HomeButton.jsx";
import countryMappings from "../data/country-db-mappings.json";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatFilenameDate(date) {
    const dd = String(date.getDate()).padStart(2, "0");
    const mon = MONTH_NAMES[date.getMonth()];
    const yyyy = date.getFullYear();
    return `${dd}-${mon}-${yyyy}`;
}

export default function PointsBalance() {
    const [selectedCountry, setSelectedCountry] = useState("");
    const [queryRows, setQueryRows] = useState([]);
    const [queryColumns, setQueryColumns] = useState([]);
    const [queryLoading, setQueryLoading] = useState(false);
    const [queryError, setQueryError] = useState("");
    const [exportStatus, setExportStatus] = useState("");

    const countryEntry = useMemo(
        () => countryMappings.find((c) => c.iso === selectedCountry) || null,
        [selectedCountry]
    );

    const handleCountryChange = (e) => {
        setSelectedCountry(e.target.value);
        setQueryRows([]);
        setQueryColumns([]);
        setQueryError("");
        setExportStatus("");
    };

    const exportCsv = async () => {
        if (!window.pointsBalance?.fetchBalance) {
            setQueryError("This feature is available only in the installed EXE.");
            return;
        }
        if (!selectedCountry) {
            setQueryError("Please select a country.");
            return;
        }
        if (!countryEntry?.catalog || !countryEntry?.schema) {
            setQueryError(
                `Database mapping for ${countryEntry?.name || selectedCountry} is not yet configured.`
            );
            return;
        }

        setQueryLoading(true);
        setQueryError("");
        setQueryRows([]);
        setQueryColumns([]);
        setExportStatus("");

        try {
            const result = await window.pointsBalance.fetchBalance(
                countryEntry.catalog,
                countryEntry.schema
            );

            const columns = result.columns || [];
            const rows = result.rows || [];

            setQueryColumns(columns);
            setQueryRows(rows);

            if (!rows.length) {
                setQueryLoading(false);
                setQueryError("No records found for the selected market.");
                return;
            }

            // Build CSV filename: ISO_Points_Balance_DD-Mon-YYYY.csv
            const dateStr = formatFilenameDate(new Date());
            const filename = `${selectedCountry}_Points_Balance_${dateStr}.csv`;

            // Stream CSV export in chunks
            const headers = columns;
            const total = rows.length;
            const chunkSize = 15000;
            let csvContent = "\uFEFF" + headers.join(",") + "\n";
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
                    headers.map((_, idx) => quoteIfNeeded(row[idx])).join(",")
                );
                csvContent += lines.join("\n") + "\n";
                processed = end;

                const percent = Math.round((processed / total) * 100);
                setExportStatus(`Exporting CSV… ${percent}%`);

                if (processed < total) {
                    setTimeout(processChunk, 0);
                } else {
                    const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = filename;
                    a.click();
                    URL.revokeObjectURL(url);
                    setExportStatus(`✓ Exported ${total.toLocaleString()} records as ${filename}`);
                    setQueryLoading(false);
                }
            };

            processChunk();
        } catch (error) {
            setQueryError(error.message || "Unable to retrieve data from Trino.");
            setQueryLoading(false);
        }
    };

    const rowCount = queryRows.length;

    return (
        <div
            className="min-h-screen w-full bg-gradient-to-br from-[#001f3f] via-[#004B93] to-[#001f3f] text-white p-10 font-sans flex flex-col items-center">
            <HomeButton/>
            {/* Header */}
            <div className="flex items-center justify-center gap-8 mb-14">
                <img src={pepsicoLogo} alt="PepsiCo Logo" className="h-28 drop-shadow-2xl"/>
                <h1 className="text-5xl font-extrabold text-white tracking-wider drop-shadow-2xl">
                    Points Balance
                </h1>
            </div>

            {/* Main Card */}
            <div
                className="flex flex-col items-center gap-8 w-full max-w-4xl bg-white/10 backdrop-blur-2xl p-12 rounded-3xl shadow-2xl border border-white/20">

                {/* Country Dropdown */}
                <div className="w-full max-w-sm flex flex-col gap-2">
                    <label
                        className="text-gray-100 font-semibold text-sm"
                        htmlFor="pb-country"
                    >
                        Country
                    </label>
                    <select
                        id="pb-country"
                        value={selectedCountry}
                        onChange={handleCountryChange}
                        className="px-4 py-3 rounded-xl bg-white text-[#001f3f] border-2 border-[#00AEEF]/50 outline-none font-medium"
                    >
                        <option value="">— Select country —</option>
                        {countryMappings.map((c) => (
                            <option key={c.iso} value={c.iso}>
                                {c.name} ({c.iso})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Error message */}
                {queryError && (
                    <div className="w-full">
                        <p className="text-red-200 font-medium text-center">{queryError}</p>
                    </div>
                )}

                {/* Export Button — centered, Voucher Decryption style */}
                <div className="flex flex-col items-center gap-4 w-full mt-2">
                    <button
                        onClick={exportCsv}
                        disabled={queryLoading}
                        className="bg-[#E4002B] hover:bg-[#c70024] active:bg-[#a5001e] disabled:opacity-60 disabled:cursor-not-allowed px-14 py-7 rounded-2xl text-white font-extrabold text-2xl shadow-2xl flex items-center gap-5 transition-all hover:scale-105 active:scale-98 border-4 border-white/30"
                    >
                        {queryLoading ? (
                            <Loader2 size={40} className="animate-spin"/>
                        ) : (
                            <Download size={40}/>
                        )}
                        {queryLoading ? "Fetching…" : "Export as CSV"}
                    </button>

                    {/* Export progress / status */}
                    {exportStatus && (
                        <div className="text-[#00AEEF] text-lg font-medium text-center">
                            {exportStatus}
                        </div>
                    )}
                </div>

                {/* Success summary card — shown after export */}
                {rowCount > 0 && !queryLoading && (
                    <div
                        className="bg-gradient-to-br from-[#004B93]/90 to-[#001f3f]/90 px-12 py-10 rounded-3xl border-2 border-[#00AEEF]/50 shadow-2xl text-center w-full">
                        <p className="text-4xl font-extrabold text-white drop-shadow-lg">
                            Exported:{" "}
                            <span className="text-[#E4002B]">{rowCount.toLocaleString()}</span>{" "}
                            records
                        </p>
                        <p className="text-gray-300 mt-4 text-sm font-medium">
                            Columns: {queryColumns.join(" • ")}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
