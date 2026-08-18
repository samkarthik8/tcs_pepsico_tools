// CustomerRewardsHistory.jsx
import React, {useMemo, useState} from "react";
import Papa from "papaparse";
import {Download, Loader2, Search} from "lucide-react";
import pepsicoLogo from "../assets/pepsico_logo.png";
import HomeButton from "./ui/HomeButton.jsx";
import countryMappings from "../data/country-db-mappings.json";

const PAGE_SIZE = 10;
const RECORD_COUNT_OPTIONS = [10, 20, 50, 100, 200];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatExportTimestamp(date) {
    const dd = String(date.getDate()).padStart(2, "0");
    const mon = MONTH_NAMES[date.getMonth()];
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${dd}-${mon}-${yyyy}_T${hh}-${mm}-${ss}`;
}

export default function CustomerRewardsHistory() {
    const [selectedCountry, setSelectedCountry] = useState("");
    const [storeId, setStoreId] = useState("");
    const [recordCount, setRecordCount] = useState(10);

    const [queryRows, setQueryRows] = useState([]);
    const [queryColumns, setQueryColumns] = useState([]);
    const [queryLoading, setQueryLoading] = useState(false);
    const [queryError, setQueryError] = useState("");
    const [notFound, setNotFound] = useState(false);

    // Activity filter
    const [activityFilter, setActivityFilter] = useState("All");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    const countryEntry = useMemo(
        () => countryMappings.find((c) => c.iso === selectedCountry) || null,
        [selectedCountry]
    );

    // Unique activity values from results
    const activityOptions = useMemo(() => {
        const activityColIdx = queryColumns.indexOf("Activity");
        if (activityColIdx === -1) return [];
        const unique = [...new Set(queryRows.map((r) => r[activityColIdx]).filter(Boolean))];
        return unique.sort();
    }, [queryRows, queryColumns]);

    // Filtered rows
    const filteredRows = useMemo(() => {
        if (activityFilter === "All") return queryRows;
        const activityColIdx = queryColumns.indexOf("Activity");
        if (activityColIdx === -1) return queryRows;
        return queryRows.filter((r) => r[activityColIdx] === activityFilter);
    }, [queryRows, queryColumns, activityFilter]);

    // Paginated rows
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
    const pagedRows = useMemo(
        () => filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
        [filteredRows, currentPage]
    );

    const fetchHistory = async () => {
        if (!window.customerRewardsHistory?.fetchHistory) {
            setQueryError("This feature is available only in the installed EXE.");
            return;
        }
        if (!selectedCountry) {
            setQueryError("Please select a country.");
            return;
        }
        if (!storeId.trim()) {
            setQueryError("Please enter an ERP Customer (Store ID).");
            return;
        }
        if (!countryEntry?.catalog || !countryEntry?.schema) {
            setQueryError(`Database mapping for ${countryEntry?.name || selectedCountry} is not yet configured.`);
            return;
        }

        setQueryLoading(true);
        setQueryError("");
        setQueryRows([]);
        setQueryColumns([]);
        setNotFound(false);
        setActivityFilter("All");
        setCurrentPage(1);

        try {
            const result = await window.customerRewardsHistory.fetchHistory(
                countryEntry.catalog,
                countryEntry.schema,
                storeId.trim(),
                recordCount
            );
            setQueryColumns(result.columns || []);
            setQueryRows(result.rows || []);
            if (!result.rows || result.rows.length === 0) {
                setNotFound(true);
            }
        } catch (error) {
            setQueryError(error.message || "Unable to retrieve data from Trino.");
        } finally {
            setQueryLoading(false);
        }
    };

    const exportCsv = () => {
        if (!queryColumns.length) return;
        const csv = Papa.unparse({fields: queryColumns, data: filteredRows});
        const blob = new Blob(["\uFEFF", csv], {type: "text/csv;charset=utf-8;"});
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const ts = formatExportTimestamp(new Date());
        link.download = `${storeId.trim()}_${selectedCountry}_activity_log_${ts}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
    };

    // Reset activity filter & page when country/store changes
    const handleCountryChange = (e) => {
        setSelectedCountry(e.target.value);
        setQueryRows([]);
        setQueryColumns([]);
        setQueryError("");
        setNotFound(false);
        setActivityFilter("All");
        setCurrentPage(1);
    };

    const handleStoreIdChange = (e) => {
        setStoreId(e.target.value);
        setQueryRows([]);
        setQueryColumns([]);
        setQueryError("");
        setNotFound(false);
        setActivityFilter("All");
        setCurrentPage(1);
    };

    return (
        <div
            className="min-h-screen w-full bg-gradient-to-br from-[#001f3f] via-[#004B93] to-[#001f3f] text-white p-10 font-sans flex flex-col items-center">
            <HomeButton/>
            <div className="flex items-center justify-center gap-8 mb-14">
                <img src={pepsicoLogo} alt="PepsiCo Logo" className="h-28 drop-shadow-2xl"/>
                <h1 className="text-5xl font-extrabold text-white tracking-wider drop-shadow-2xl">
                    Customer Rewards History
                </h1>
            </div>

            <div
                className="flex flex-col items-center gap-8 w-full max-w-6xl bg-white/10 backdrop-blur-2xl p-12 rounded-3xl shadow-2xl border border-white/20">

                {/* Controls row */}
                {/* Controls row */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

                    {/* Country */}
                    <div className="flex flex-col gap-2">
                        <label
                            className="text-gray-100 font-semibold text-sm"
                            htmlFor="crh-country"
                        >
                            Country
                        </label>

                        <select
                            id="crh-country"
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


                    {/* ERP Customer / Store ID */}
                    <div className="flex flex-col gap-2">
                        <label
                            className="text-gray-100 font-semibold text-sm"
                            htmlFor="crh-store"
                        >
                            ERP Customer (Store ID)
                        </label>

                        <input
                            id="crh-store"
                            type="text"
                            value={storeId}
                            onChange={handleStoreIdChange}
                            onKeyDown={(e) => e.key === "Enter" && fetchHistory()}
                            placeholder="Ex: 0103864150"
                            className="px-4 py-3 rounded-xl bg-white text-[#001f3f] border-2 border-[#00AEEF]/50 outline-none"
                        />
                    </div>


                    {/* Records Count */}
                    <div className="flex flex-col gap-2">
                        <label
                            className="text-gray-100 font-semibold text-sm"
                            htmlFor="crh-count"
                        >
                            Records Count
                        </label>

                        <select
                            id="crh-count"
                            value={recordCount}
                            onChange={(e) => setRecordCount(Number(e.target.value))}
                            className="px-4 py-3 rounded-xl bg-white text-[#001f3f] border-2 border-[#00AEEF]/50 outline-none font-medium"
                        >
                            {RECORD_COUNT_OPTIONS.map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                    </div>


                    {/* Fetch Button */}
                    <div className="flex flex-col gap-2 justify-end">
                        <button
                            onClick={fetchHistory}
                            disabled={queryLoading}
                            className="w-full bg-[#E4002B] disabled:opacity-60 hover:bg-[#c70024] px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-3 transition"
                        >
                            {queryLoading ? (
                                <Loader2 className="animate-spin"/>
                            ) : (
                                <Search/>
                            )}

                            {queryLoading ? "Fetching..." : "Fetch History"}
                        </button>
                    </div>

                </div>
                {/* Error message */}
                {queryError && (
                    <div className="w-full">
                        <p className="text-red-200 font-medium">
                            {queryError}
                        </p>
                    </div>
                )}

                {/* Not found message */}
                {notFound && !queryLoading && (
                    <div
                        className="w-full bg-yellow-400/10 border border-yellow-400/40 rounded-2xl px-6 py-5 text-yellow-200">
                        <p className="font-semibold text-lg mb-1">No records found.</p>
                        <p className="text-sm">
                            No reward activity was found for this customer. Please double-check the selected{" "}
                            <span className="font-bold">Country</span> and{" "}
                            <span className="font-bold">ERP Customer (Store ID)</span> and try again.
                        </p>
                    </div>
                )}

                {/* Results */}
                {queryColumns.length > 0 && !queryLoading && (
                    <div className="w-full flex flex-col gap-4">
                        {/* Toolbar: activity filter + export */}
                        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <label className="text-gray-200 font-semibold text-sm whitespace-nowrap">
                                    Filter by Activity:
                                </label>
                                <select
                                    value={activityFilter}
                                    onChange={(e) => {
                                        setActivityFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="px-3 py-2 rounded-lg bg-white text-[#001f3f] border-2 border-[#00AEEF]/50 outline-none text-sm font-medium"
                                >
                                    <option value="All">All</option>
                                    {activityOptions.map((a) => (
                                        <option key={a} value={a}>{a}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={exportCsv}
                                className="bg-[#E4002B] hover:bg-[#c70024] px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition text-sm"
                            >
                                <Download size={16}/> Export to CSV
                            </button>
                        </div>

                        {/* Table */}
                        <div className="w-full overflow-x-auto rounded-2xl border border-white/20">
                            <div className="px-5 py-3 bg-black/30 font-semibold text-sm text-gray-200">
                                Showing {pagedRows.length === 0 ? 0 : ((currentPage - 1) * PAGE_SIZE + 1)}–{Math.min(currentPage * PAGE_SIZE, filteredRows.length)} of {filteredRows.length.toLocaleString()} record{filteredRows.length !== 1 ? "s" : ""}
                                {activityFilter !== "All" && (
                                    <span className="ml-2 text-[#00AEEF]">(filtered by "{activityFilter}")</span>
                                )}
                            </div>
                            <table className="w-full text-left bg-white/10 text-sm">
                                <thead className="bg-[#001f3f]/90 text-[#00AEEF]">
                                <tr>
                                    {queryColumns.map((col) => (
                                        <th key={col} className="px-4 py-3 whitespace-nowrap">{col}</th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody>
                                {pagedRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={queryColumns.length}
                                            className="px-4 py-6 text-center text-gray-300">
                                            No records match the current filter.
                                        </td>
                                    </tr>
                                ) : (
                                    pagedRows.map((row, rowIdx) => (
                                        <tr key={rowIdx}
                                            className="border-t border-white/10 hover:bg-white/5 transition">
                                            {queryColumns.map((_, colIdx) => (
                                                <td key={colIdx} className="px-4 py-3 whitespace-nowrap">
                                                    {row[colIdx] ?? ""}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-2">
                                <button
                                    onClick={() => handlePageChange(1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm font-medium"
                                >
                                    «
                                </button>
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm font-medium"
                                >
                                    ‹
                                </button>

                                {/* Page number buttons */}
                                {Array.from({length: totalPages}, (_, i) => i + 1)
                                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                                    .reduce((acc, p, idx, arr) => {
                                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                                        acc.push(p);
                                        return acc;
                                    }, [])
                                    .map((item, idx) =>
                                        item === "..." ? (
                                            <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">…</span>
                                        ) : (
                                            <button
                                                key={item}
                                                onClick={() => handlePageChange(item)}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                                                    item === currentPage
                                                        ? "bg-[#E4002B] text-white"
                                                        : "bg-white/10 hover:bg-white/20"
                                                }`}
                                            >
                                                {item}
                                            </button>
                                        )
                                    )}

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm font-medium"
                                >
                                    ›
                                </button>
                                <button
                                    onClick={() => handlePageChange(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm font-medium"
                                >
                                    »
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
